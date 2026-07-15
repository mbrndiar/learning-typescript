import { TaskManager } from "../task-core/manager.ts";
import { TaskNotFoundError, type TaskStorage } from "../task-core/storage.ts";
import { normalizeTitle } from "../task-core/task.ts";

class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

const maximumBodyBytes = 64 * 1024;

export interface BunTaskServerOptions {
  readonly hostname?: string;
  readonly port?: number;
}

function json(status: number, value: unknown): Response {
  return Response.json(value, {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function requireJson(request: Request): void {
  const mediaType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (mediaType !== "application/json") {
    throw new BadRequestError("content-type must be application/json");
  }
}

async function readJson(request: Request): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const length = Number(contentLength);
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

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
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

function parseId(pathname: string, suffix = ""): number | undefined {
  const pattern =
    suffix === ""
      ? /^\/tasks\/([1-9]\d*)$/
      : new RegExp(`^/tasks/([1-9]\\d*)/${suffix}$`);
  const match = pattern.exec(pathname);
  return match === null ? undefined : Number(match[1]);
}

export function createBunTaskHandler(
  storage: TaskStorage,
  logError: (error: unknown) => void = console.error,
): (request: Request) => Promise<Response> {
  const manager = new TaskManager(storage);

  return async (request: Request): Promise<Response> => {
    try {
      const { pathname } = new URL(request.url);

      if (request.method === "GET" && pathname === "/tasks") {
        return json(200, await manager.list());
      }
      if (request.method === "POST" && pathname === "/tasks") {
        requireJson(request);
        const task = await manager.add(parseTitle(await readJson(request)));
        return json(201, task);
      }

      const completeId = parseId(pathname, "complete");
      if (request.method === "PATCH" && completeId !== undefined) {
        return json(200, await manager.complete(completeId));
      }

      const removeId = parseId(pathname);
      if (request.method === "DELETE" && removeId !== undefined) {
        await manager.remove(removeId);
        return new Response(null, { status: 204 });
      }

      return json(404, { error: "not found" });
    } catch (error: unknown) {
      if (error instanceof TaskNotFoundError) {
        return json(404, { error: error.message });
      }
      if (error instanceof BadRequestError) {
        return json(400, { error: error.message });
      }
      logError(error);
      return json(500, { error: "internal server error" });
    }
  };
}

export function createBunTaskServer(
  storage: TaskStorage,
  options: BunTaskServerOptions = {},
): Bun.Server<undefined> {
  const handle = createBunTaskHandler(storage);
  return Bun.serve({
    hostname: options.hostname ?? "127.0.0.1",
    port: options.port ?? 0,
    development: false,
    routes: {
      "/tasks": {
        GET: handle,
        POST: handle,
      },
    },
    fetch: handle,
    error(error) {
      console.error(error);
      return json(500, { error: "internal server error" });
    },
  });
}
