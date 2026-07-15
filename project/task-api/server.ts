import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

import { TaskManager } from "../task-manager/manager.ts";
import { TaskNotFoundError, type TaskStorage } from "../task-manager/storage.ts";
import { normalizeTitle } from "../task-manager/task.ts";

class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 64 * 1024) {
      throw new BadRequestError("request body is too large");
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    throw new BadRequestError("request body is required");
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
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

function requireJson(request: IncomingMessage): void {
  const contentType = request.headers["content-type"];
  const mediaType = contentType?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    throw new BadRequestError("content-type must be application/json");
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

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(`${JSON.stringify(value)}\n`);
}

export function createTaskServer(storage: TaskStorage): Server {
  const manager = new TaskManager(storage);

  return createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? "/", "http://localhost");

      if (request.method === "GET" && url.pathname === "/tasks") {
        sendJson(response, 200, await manager.list());
        return;
      }
      if (request.method === "POST" && url.pathname === "/tasks") {
        requireJson(request);
        const task = await manager.add(parseTitle(await readJson(request)));
        sendJson(response, 201, task);
        return;
      }

      const completeId = parseId(url.pathname, "complete");
      if (request.method === "PATCH" && completeId !== undefined) {
        sendJson(response, 200, await manager.complete(completeId));
        return;
      }

      const removeId = parseId(url.pathname);
      if (request.method === "DELETE" && removeId !== undefined) {
        await manager.remove(removeId);
        response.writeHead(204);
        response.end();
        return;
      }

      sendJson(response, 404, { error: "not found" });
    })().catch((error: unknown) => {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      if (error instanceof TaskNotFoundError) {
        sendJson(response, 404, { error: error.message });
      } else if (error instanceof BadRequestError) {
        sendJson(response, 400, { error: error.message });
      } else {
        console.error(error);
        sendJson(response, 500, { error: "internal server error" });
      }
    });
  });
}
