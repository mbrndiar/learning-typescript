import {
  relayFailure,
  type RelayHttpHandler,
  type RelayHttpRequest,
  type RuntimeCapabilities,
  type ServeOptions,
} from "../core/index.ts";
import { DenoFileEventLog } from "./file-log.ts";

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

export async function serveDenoRelay(
  options: ServeOptions,
  handler: RelayHttpHandler,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) {
    throw relayFailure("cancelled", "operation was cancelled");
  }
  const server = Deno.serve(
    {
      hostname: options.host,
      port: options.port,
      signal,
      onListen: (address) => options.onListen?.(address.port),
    },
    async (request) => {
      const result = await handler(requestAdapter(request));
      return new Response(result.body, {
        status: result.status,
        headers: result.headers,
      });
    },
  );
  await server.finished;
}

async function* readDenoInput(
  path: string,
  signal: AbortSignal,
): AsyncIterable<Uint8Array> {
  const file = path === "-" ? undefined : await Deno.open(path, { read: true });
  const reader = file ?? Deno.stdin;
  const buffer = new Uint8Array(16 * 1024);
  try {
    while (true) {
      if (signal.aborted) {
        throw relayFailure("cancelled", "operation was cancelled");
      }
      const count = await reader.read(buffer);
      if (count === null) {
        return;
      }
      yield buffer.slice(0, count);
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
    file?.close();
  }
}

export function createDenoCapabilities(
  signal: AbortSignal,
): RuntimeCapabilities {
  return {
    signal,
    io: {
      stdout: (text) => Deno.stdout.writeSync(new TextEncoder().encode(text)),
      stderr: (text) => Deno.stderr.writeSync(new TextEncoder().encode(text)),
    },
    openLog: (path, capacity) => new DenoFileEventLog(path, capacity),
    readInput: readDenoInput,
    serve: serveDenoRelay,
  };
}
