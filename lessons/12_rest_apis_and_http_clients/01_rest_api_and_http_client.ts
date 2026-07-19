import { once } from "node:events";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

// This lesson keeps the REST boundary explicit: bytes become unknown JSON,
// unknown JSON is validated into domain data, and responses leave as status
// codes plus JSON.
interface CreateTask {
  readonly title: string;
}

interface Task extends CreateTask {
  readonly id: number;
  readonly done: boolean;
}

// readJson consumes the request stream under a small size limit. It returns
// unknown because decoding JSON does not prove the value matches our domain
// shape; validation happens at the next boundary.
async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    // Count bytes while streaming so an oversized client is rejected before
    // the server commits to buffering an unbounded body in memory.
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 16_384) {
      throw new Error("request body is too large");
    }
    chunks.push(buffer);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

// parseCreateTask is the runtime contract for this endpoint. TypeScript types
// protect code after this point, but clients can send any JSON shape.
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

function parseTask(value: unknown): Task {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("response task must be an object");
  }
  const record = value as Record<string, unknown>;
  const id = record.id;
  if (
    typeof id !== "number" ||
    !Number.isSafeInteger(id) ||
    typeof record.title !== "string" ||
    typeof record.done !== "boolean"
  ) {
    throw new TypeError("response task has an invalid shape");
  }
  return {
    id,
    title: record.title,
    done: record.done,
  };
}

// Headers and status must be chosen before the body is ended; after bytes are
// written, the HTTP response boundary is already visible to the client.
function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(`${JSON.stringify(value)}\n`);
}

// handle separates protocol checks from domain work. Bad method, path,
// content type, body size, or body shape is handled before a task is created.
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
  // createServer does not await an async handler for us. Catching here keeps
  // an unexpected rejection from becoming an unhandled process-level failure.
  void handle(request, response).catch((error: unknown) => {
    console.error(error);
    if (!response.headersSent) {
      sendJson(response, 500, { error: "internal error" });
    } else {
      response.destroy();
    }
  });
});

// Port 0 asks the OS for a free ephemeral port, avoiding collisions when
// lessons or tests run in parallel on the same machine.
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
    signal: AbortSignal.timeout(1_000),
  });
  if (!response.ok) {
    throw new Error(`task request failed with HTTP ${response.status}`);
  }
  const decoded: unknown = await response.json();
  const created = parseTask(decoded);
  console.log(response.status, created);
} finally {
  // Closing the server is part of the lifecycle: without it, the open socket
  // keeps the Node.js process alive after the demonstration request finishes.
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
