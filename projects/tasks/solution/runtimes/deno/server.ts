import { type TaskService, ValidationError } from "../../core/index.ts";
import { dispatchHttp, type HttpResponse } from "../../core/http.ts";
import { MAX_REQUEST_BYTES, readBoundedStream } from "../../core/json.ts";
import type { RunningServer } from "../../core/runtime.ts";

export interface DenoServerOptions {
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

function invalidBodyResponse(): Response {
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

export async function startDenoServer(
  options: DenoServerOptions,
): Promise<RunningServer> {
  const hostname = options.hostname ?? "127.0.0.1";
  const controller = new AbortController();
  let readyResolve: ((port: number) => void) | undefined;
  const ready = new Promise<number>((resolve) => {
    readyResolve = resolve;
  });
  const server = Deno.serve(
    {
      hostname,
      port: options.port ?? 0,
      signal: controller.signal,
      onListen: (address) => readyResolve?.(address.port),
    },
    async (request) => {
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
        if (error instanceof ValidationError) return invalidBodyResponse();
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
  );
  const port = await ready;
  let closePromise: Promise<void> | undefined;
  return Object.freeze({
    url: `http://${hostname}:${port}`,
    finished: server.finished,
    close(): Promise<void> {
      if (closePromise !== undefined) return closePromise;
      controller.abort();
      closePromise = server.finished;
      return closePromise;
    },
  });
}
