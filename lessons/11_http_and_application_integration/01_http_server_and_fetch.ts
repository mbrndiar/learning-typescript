import { once } from "node:events";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

interface CreateTask {
  readonly title: string;
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 16_384) {
      throw new Error("request body is too large");
    }
    chunks.push(buffer);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function parseCreateTask(value: unknown): CreateTask {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("body must be an object");
  }
  const title = (value as Record<string, unknown>).title;
  if (typeof title !== "string" || title.trim() === "") {
    throw new TypeError("title must be non-empty");
  }
  return { title: title.trim() };
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(`${JSON.stringify(value)}\n`);
}

async function handle(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  if (request.method !== "POST" || request.url !== "/tasks") {
    sendJson(response, 404, { error: "not found" });
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
    const task = parseCreateTask(await readJson(request));
    sendJson(response, 201, { id: 1, ...task, done: false });
  } catch (error: unknown) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : "invalid request",
    });
  }
}

const server = createServer((request, response) => {
  void handle(request, response).catch((error: unknown) => {
    console.error(error);
    if (!response.headersSent) {
      sendJson(response, 500, { error: "internal error" });
    } else {
      response.destroy();
    }
  });
});

server.listen(0, "127.0.0.1");
await once(server, "listening");

try {
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("expected a TCP address");
  }

  const response = await fetch(`http://127.0.0.1:${address.port}/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Learn HTTP boundaries" }),
  });

  console.log(response.status, await response.json());
} finally {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
