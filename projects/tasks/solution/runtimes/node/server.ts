import {
  createServer,
  type IncomingHttpHeaders,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { LifecycleError, ValidationError, type TaskService } from "../../core/index.ts";
import { dispatchHttp, type HttpResponse } from "../../core/http.ts";
import { MAX_REQUEST_BYTES } from "../../core/json.ts";
import { formatServerUrl, type RunningServer } from "../../core/runtime.ts";

export interface NodeServerOptions {
  readonly service: TaskService;
  readonly hostname?: string;
  readonly port?: number;
  readonly logError?: (error: unknown) => void;
}

function flattenHeaders(
  headers: IncomingHttpHeaders,
): Readonly<Record<string, string | undefined>> {
  const result: Record<string, string | undefined> = {};
  for (const [name, value] of Object.entries(headers)) {
    result[name.toLowerCase()] = Array.isArray(value) ? value.join(", ") : value;
  }
  return Object.freeze(result);
}

function readBody(request: IncomingMessage, maximumBytes: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let length = 0;
    let exceeded = false;
    request.on("data", (chunk: unknown) => {
      if (!(chunk instanceof Uint8Array)) {
        reject(new LifecycleError("node request emitted a non-byte chunk"));
        return;
      }
      length += chunk.byteLength;
      if (length > maximumBytes) {
        exceeded = true;
        chunks.length = 0;
        return;
      }
      if (!exceeded) chunks.push(chunk);
    });
    request.once("error", reject);
    request.once("end", () => {
      if (exceeded) {
        reject(new ValidationError(`body exceeds ${maximumBytes} bytes`));
        return;
      }
      const body = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.byteLength;
      }
      resolve(body);
    });
  });
}

function writeResponse(response: ServerResponse, value: HttpResponse): void {
  response.writeHead(value.status, value.headers);
  response.end(value.body);
}

function listen(server: Server, hostname: string, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error): void => reject(error);
    server.once("error", onError);
    server.listen(port, hostname, () => {
      server.off("error", onError);
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new LifecycleError("node server has no TCP address"));
        return;
      }
      resolve(address.port);
    });
  });
}

export async function startNodeServer(
  options: NodeServerOptions,
): Promise<RunningServer> {
  const hostname = options.hostname ?? "127.0.0.1";
  const service = options.service;
  const logError = options.logError ?? ((error: unknown) => console.error(error));
  const server = createServer(async (request, response) => {
    try {
      const body = await readBody(request, MAX_REQUEST_BYTES);
      writeResponse(
        response,
        await dispatchHttp(
          service,
          {
            method: request.method ?? "",
            url: request.url ?? "/",
            headers: flattenHeaders(request.headers),
            body,
          },
          logError,
        ),
      );
    } catch (error) {
      if (error instanceof ValidationError) {
        writeResponse(response, {
          status: 400,
          headers: { "content-type": "application/json; charset=utf-8" },
          body: new TextEncoder().encode(
            JSON.stringify({
              error: {
                code: "invalid_json",
                message: "request body must be valid JSON",
              },
            }),
          ),
        });
      } else {
        logError(error);
        if (!response.headersSent) {
          writeResponse(response, {
            status: 500,
            headers: { "content-type": "application/json; charset=utf-8" },
            body: new TextEncoder().encode(
              JSON.stringify({
                error: {
                  code: "internal_error",
                  message: "the server could not complete the request",
                },
              }),
            ),
          });
        } else {
          response.destroy();
        }
      }
    }
  });
  const port = await listen(server, hostname, options.port ?? 0);
  let closePromise: Promise<void> | undefined;
  const finished = new Promise<void>((resolve, reject) => {
    server.once("close", resolve);
    server.once("error", reject);
  });
  return Object.freeze({
    url: formatServerUrl(hostname, port),
    finished,
    close(): Promise<void> {
      if (closePromise !== undefined) return closePromise;
      closePromise = new Promise((resolve, reject) => {
        server.close((error) => {
          if (error === undefined) resolve();
          else reject(new LifecycleError("could not close node server", error));
        });
        server.closeIdleConnections();
      });
      return closePromise;
    },
  });
}
