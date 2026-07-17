import { once } from "node:events";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";

export interface CreateTask {
  readonly title: string;
}

export interface Task {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
}

export interface TaskServer {
  readonly url: string;
  close(): Promise<void>;
}

export function parseCreateTask(value: unknown): CreateTask {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("request body must be an object");
  }

  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || !Object.hasOwn(record, "title")) {
    throw new TypeError("request body must contain only title");
  }
  if (typeof record.title !== "string" || record.title.trim() === "") {
    throw new TypeError("title must be a non-empty string");
  }
  return { title: record.title.trim() };
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 16_384) {
      throw new RangeError("request body is too large");
    }
    chunks.push(buffer);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(`${JSON.stringify(value)}\n`);
}

export async function startTaskServer(): Promise<TaskServer> {
  const tasks: Task[] = [];
  let nextId = 1;
  const server = createServer((request, response) => {
    void handleRequest(request, response).catch((error: unknown) => {
      if (!response.headersSent) {
        sendJson(response, 500, {
          error: error instanceof Error ? error.message : "internal error",
        });
      } else {
        response.destroy();
      }
    });
  });

  async function handleRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    if (request.url !== "/tasks") {
      sendJson(response, 404, { error: "not found" });
      return;
    }
    if (request.method === "GET") {
      sendJson(response, 200, { tasks });
      return;
    }
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "method not allowed" });
      return;
    }

    try {
      const mediaType = request.headers["content-type"]
        ?.split(";", 1)[0]
        ?.trim()
        .toLowerCase();
      if (mediaType !== "application/json") {
        throw new TypeError("content-type must be application/json");
      }

      const task: Task = {
        id: nextId,
        ...parseCreateTask(await readJson(request)),
        done: false,
      };
      nextId += 1;
      tasks.push(task);
      sendJson(response, 201, task);
    } catch (error: unknown) {
      sendJson(response, error instanceof RangeError ? 413 : 400, {
        error: error instanceof Error ? error.message : "invalid request",
      });
    }
  }

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") {
    server.close();
    throw new Error("expected a TCP address");
  }

  let closed = false;
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: async (): Promise<void> => {
      if (closed) {
        return;
      }
      await closeServer(server);
      closed = true;
    },
  };
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error === undefined) {
        resolve();
      } else {
        reject(error);
      }
    });
  });
}
