import {
  relayFailure,
  type RelayHttpHandler,
  type RelayHttpRequest,
  type RuntimeCapabilities,
  type ServeOptions,
} from "../core/index.ts";
import { BunFileEventLog } from "./file-log.ts";

async function* webBody(
  stream: ReadableStream<Uint8Array> | null,
): AsyncIterable<Uint8Array> {
  if (stream === null) {
    return;
  }
  const reader = stream.getReader();
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) {
        return;
      }
      yield result.value;
    }
  } finally {
    reader.releaseLock();
  }
}

function requestAdapter(request: Request): RelayHttpRequest {
  return {
    method: request.method,
    url: request.url,
    headers: request.headers,
    body: request.body === null ? null : webBody(request.body),
  };
}

export async function serveBunRelay(
  options: ServeOptions,
  handler: RelayHttpHandler,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) {
    throw relayFailure("cancelled", "operation was cancelled");
  }
  const server = Bun.serve({
    hostname: options.host,
    port: options.port,
    development: false,
    async fetch(request) {
      const result = await handler(requestAdapter(request));
      return new Response(result.body, {
        status: result.status,
        headers: result.headers,
      });
    },
  });
  if (server.port === undefined) {
    await server.stop(true);
    throw relayFailure("log_io", "Bun relay server did not bind a port");
  }
  options.onListen?.(server.port);
  await new Promise<void>((resolve) => {
    const stop = () => resolve();
    signal.addEventListener("abort", stop, { once: true });
    if (signal.aborted) {
      stop();
    }
  });
  await server.stop(false);
}

async function* readBunInput(
  path: string,
  signal: AbortSignal,
): AsyncIterable<Uint8Array> {
  const stream = path === "-" ? Bun.stdin.stream() : Bun.file(path).stream();
  const reader = stream.getReader();
  try {
    while (true) {
      if (signal.aborted) {
        throw relayFailure("cancelled", "operation was cancelled");
      }
      const result = await reader.read();
      if (result.done) {
        return;
      }
      yield result.value;
    }
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error.code === "cancelled" || error.code === "log_io")
    ) {
      throw error;
    }
    throw relayFailure("log_io", "unable to read relay input");
  } finally {
    reader.releaseLock();
  }
}

export function createBunCapabilities(signal: AbortSignal): RuntimeCapabilities {
  return {
    signal,
    io: {
      stdout: (text) => process.stdout.write(text),
      stderr: (text) => process.stderr.write(text),
    },
    openLog: (path, capacity) => new BunFileEventLog(path, capacity),
    readInput: readBunInput,
    serve: serveBunRelay,
  };
}
