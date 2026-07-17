import { ValidationError, type TaskService } from "../../core/index.ts";
import { dispatchHttp, type HttpResponse } from "../../core/http.ts";
import { MAX_REQUEST_BYTES, readBoundedStream } from "../../core/json.ts";
import type { RunningServer } from "../../core/runtime.ts";

export interface BunServerOptions {
  readonly service: TaskService;
  readonly hostname?: string;
  readonly port?: number;
  readonly logError?: (error: unknown) => void;
}

function responseFromContract(value: HttpResponse): Response {
  return new Response(new Uint8Array(value.body).buffer, {
    status: value.status,
    headers: value.headers,
  });
}

export function startBunServer(options: BunServerOptions): RunningServer {
  const hostname = options.hostname ?? "127.0.0.1";
  let finish: (() => void) | undefined;
  const finished = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const server = Bun.serve({
    hostname,
    port: options.port ?? 0,
    fetch: async (request) => {
      try {
        const headers: Record<string, string> = {};
        request.headers.forEach((value, key) => {
          headers[key.toLowerCase()] = value;
        });
        return responseFromContract(
          await dispatchHttp(
            options.service,
            {
              method: request.method,
              url: request.url,
              headers,
              body: await readBoundedStream(request.body, MAX_REQUEST_BYTES),
            },
            options.logError,
          ),
        );
      } catch (error) {
        if (error instanceof ValidationError) {
          return Response.json(
            {
              error: {
                code: "invalid_json",
                message: "request body must be valid JSON",
              },
            },
            { status: 400 },
          );
        }
        (options.logError ?? console.error)(error);
        return Response.json(
          {
            error: {
              code: "internal_error",
              message: "the server could not complete the request",
            },
          },
          { status: 500 },
        );
      }
    },
  });
  let closePromise: Promise<void> | undefined;
  return Object.freeze({
    url: `http://${hostname}:${server.port}`,
    finished,
    close(): Promise<void> {
      if (closePromise !== undefined) return closePromise;
      closePromise = Promise.resolve(server.stop(true)).then(() => finish?.());
      return closePromise;
    },
  });
}
