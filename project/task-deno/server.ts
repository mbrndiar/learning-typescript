import { TaskManager } from "../task-core/manager.ts";
import { TaskNotFoundError, type TaskStorage } from "../task-core/storage.ts";
import { normalizeTitle } from "../task-core/task.ts";

const maximumBodyBytes = 64 * 1024;

class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

export interface TaskServerOptions {
  readonly hostname?: string;
  readonly port?: number;
  readonly signal?: AbortSignal;
  readonly onListen?: (address: Deno.NetAddr) => void;
  readonly logError?: (error: unknown) => void;
}

async function readJson(request: Request): Promise<unknown> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0) {
      throw new BadRequestError("content-length must be a non-negative integer");
    }
    if (length > maximumBodyBytes) {
      throw new BadRequestError("request body is too large");
    }
  }
  if (request.body === null) {
    throw new BadRequestError("request body is required");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) {
      break;
    }
    size += result.value.byteLength;
    if (size > maximumBodyBytes) {
      await reader.cancel();
      throw new BadRequestError("request body is too large");
    }
    chunks.push(result.value);
  }
  if (size === 0) {
    throw new BadRequestError("request body is required");
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(body)) as unknown;
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      throw new BadRequestError("request body must contain valid JSON");
    }
    throw error;
  }
}

function parseTitle(value: unknown): string {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new BadRequestError("request body must be an object");
  }
  const title = (value as Record<string, unknown>).title;
  if (typeof title !== "string") {
    throw new BadRequestError("request body title must be a string");
  }
  try {
    return normalizeTitle(title);
  } catch (error: unknown) {
    if (error instanceof TypeError || error instanceof RangeError) {
      throw new BadRequestError(error.message);
    }
    throw error;
  }
}

function requireJson(request: Request): void {
  const mediaType = request.headers.get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (mediaType !== "application/json") {
    throw new BadRequestError("content-type must be application/json");
  }
}

function parseId(pathname: string, suffix = ""): number | undefined {
  const pattern = suffix === ""
    ? /^\/tasks\/([1-9]\d*)$/
    : new RegExp(`^/tasks/([1-9]\\d*)/${suffix}$`);
  const match = pattern.exec(pathname);
  return match === null ? undefined : Number(match[1]);
}

function jsonResponse(status: number, value: unknown): Response {
  return new Response(`${JSON.stringify(value)}\n`, {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function createTaskHandler(
  storage: TaskStorage,
  logError: (error: unknown) => void = console.error,
): (request: Request) => Promise<Response> {
  const manager = new TaskManager(storage);

  return async (request: Request): Promise<Response> => {
    try {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/tasks") {
        return jsonResponse(200, await manager.list());
      }
      if (request.method === "POST" && url.pathname === "/tasks") {
        requireJson(request);
        return jsonResponse(201, await manager.add(parseTitle(await readJson(request))));
      }

      const completeId = parseId(url.pathname, "complete");
      if (request.method === "PATCH" && completeId !== undefined) {
        return jsonResponse(200, await manager.complete(completeId));
      }

      const removeId = parseId(url.pathname);
      if (request.method === "DELETE" && removeId !== undefined) {
        await manager.remove(removeId);
        return new Response(null, { status: 204 });
      }
      return jsonResponse(404, { error: "not found" });
    } catch (error: unknown) {
      if (error instanceof TaskNotFoundError) {
        return jsonResponse(404, { error: error.message });
      }
      if (error instanceof BadRequestError) {
        return jsonResponse(400, { error: error.message });
      }
      logError(error);
      return jsonResponse(500, { error: "internal server error" });
    }
  };
}

export function serveTaskApi(
  storage: TaskStorage,
  options: TaskServerOptions = {},
): Deno.HttpServer<Deno.NetAddr> {
  return Deno.serve(
    {
      hostname: options.hostname ?? "127.0.0.1",
      port: options.port ?? 8080,
      signal: options.signal,
      onListen: options.onListen,
    },
    createTaskHandler(storage, options.logError),
  );
}
