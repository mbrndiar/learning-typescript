import { createReadStream } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import {
  RelayFailure,
  relayFailure,
  type RelayHttpHandler,
  type RelayHttpRequest,
  type RuntimeCapabilities,
  type ServeOptions,
} from "../core/index.ts";
import { NodeFileEventLog } from "./file-log.ts";

function headerValue(request: IncomingMessage, name: string): string | null {
  const value = request.headers[name.toLowerCase()];
  if (value === undefined) {
    return null;
  }
  return Array.isArray(value) ? value.join(",") : value;
}

async function* nodeBody(request: IncomingMessage): AsyncIterable<Uint8Array> {
  const iterable: AsyncIterable<unknown> = request;
  for await (const chunk of iterable) {
    if (chunk instanceof Uint8Array) {
      yield chunk;
    } else if (typeof chunk === "string") {
      yield new TextEncoder().encode(chunk);
    } else {
      throw relayFailure("invalid_json", "request body contains invalid bytes");
    }
  }
}

function requestAdapter(request: IncomingMessage): RelayHttpRequest {
  return {
    method: request.method ?? "",
    url: request.url ?? "/",
    headers: {
      get: (name) => headerValue(request, name),
    },
    body:
      request.method === "GET" || request.method === "HEAD" ? null : nodeBody(request),
  };
}

function send(
  response: ServerResponse,
  result: Awaited<ReturnType<RelayHttpHandler>>,
): void {
  response.writeHead(result.status, result.headers);
  response.end(result.body);
}

export async function serveNodeRelay(
  options: ServeOptions,
  handler: RelayHttpHandler,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) {
    throw relayFailure("cancelled", "operation was cancelled");
  }
  const server = createServer((request, response) => {
    void handler(requestAdapter(request)).then(
      (result) => send(response, result),
      () => {
        if (!response.headersSent) {
          response.writeHead(500, {
            "content-type": "application/json; charset=utf-8",
          });
        }
        response.end(
          '{"error":{"code":"log_io","message":"internal relay error","details":{}}}\n',
        );
      },
    );
  });

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    server.once("error", onError);
    server.listen(options.port, options.host, () => {
      server.off("error", onError);
      const address = server.address();
      if (typeof address === "object" && address !== null) {
        options.onListen?.(address.port);
      }
      resolve();
    });
  }).catch((error: unknown) => {
    throw error instanceof RelayFailure
      ? error
      : relayFailure("log_io", "unable to start relay server");
  });

  await new Promise<void>((resolve, reject) => {
    const close = () => {
      server.close((error) => {
        signal.removeEventListener("abort", close);
        if (error === undefined) {
          resolve();
        } else {
          reject(error);
        }
      });
    };
    signal.addEventListener("abort", close, { once: true });
    server.once("error", reject);
    if (signal.aborted) {
      close();
    }
  }).catch(() => {
    throw relayFailure("log_io", "relay server failed while shutting down");
  });
}

async function* readNodeInput(
  path: string,
  signal: AbortSignal,
): AsyncIterable<Uint8Array> {
  const stream = path === "-" ? process.stdin : createReadStream(path);
  const iterable: AsyncIterable<unknown> = stream;
  try {
    for await (const chunk of iterable) {
      if (signal.aborted) {
        throw relayFailure("cancelled", "operation was cancelled");
      }
      if (chunk instanceof Uint8Array) {
        yield chunk;
      } else if (typeof chunk === "string") {
        yield new TextEncoder().encode(chunk);
      } else {
        throw relayFailure("log_io", "input produced an unsupported chunk");
      }
    }
  } catch (error: unknown) {
    if (error instanceof RelayFailure) {
      throw error;
    }
    throw relayFailure("log_io", "unable to read relay input");
  } finally {
    if (path !== "-") {
      stream.destroy();
    }
  }
}

export function createNodeCapabilities(signal: AbortSignal): RuntimeCapabilities {
  return {
    signal,
    io: {
      stdout: (text) => process.stdout.write(text),
      stderr: (text) => process.stderr.write(text),
    },
    openLog: (path, capacity) => new NodeFileEventLog(path, capacity),
    readInput: readNodeInput,
    serve: serveNodeRelay,
  };
}
