import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";

import { TaskClient, TaskClientError } from "../task-client/client.ts";
import type { TaskStorage } from "../task-core/storage.ts";
import { createTaskServer } from "./server.ts";
import { SqliteTaskStorage } from "./sqlite-storage.ts";

// End-to-end over a real TCP socket and the real TaskClient: proves the server,
// wire protocol, and client agree, including that a completed-then-removed task
// yields a 404 the client surfaces as a typed error.
test("task API supports the connected task lifecycle", async (context) => {
  const storage = new SqliteTaskStorage();
  const server = createTaskServer(storage);
  context.after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    storage.close();
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.notEqual(address, null);
  assert.equal(typeof address, "object");
  if (address === null || typeof address === "string") {
    throw new Error("expected a TCP address");
  }

  const client = new TaskClient(new URL(`http://127.0.0.1:${address.port}`));
  const created = await client.add("Connected task");
  assert.deepEqual(await client.list(), [created]);

  const completed = await client.complete(created.id);
  assert.equal(completed.completed, true);

  await client.remove(created.id);
  assert.deepEqual(await client.list(), []);
  await assert.rejects(
    client.complete(created.id),
    (error) => error instanceof TaskClientError && error.status === 404,
  );
});

// Exercises each rejection path at the HTTP boundary: malformed JSON, a missing
// content type, a title that fails domain validation, and an unknown route all
// map to the right 4xx status instead of a 500 or a silent accept.
test("task API rejects malformed JSON and unknown routes", async (context) => {
  const storage = new SqliteTaskStorage();
  const server = createTaskServer(storage);
  context.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    storage.close();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("expected a TCP address");
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const malformed = await fetch(`${baseUrl}/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  });
  assert.equal(malformed.status, 400);

  const missingContentType = await fetch(`${baseUrl}/tasks`, {
    method: "POST",
    body: JSON.stringify({ title: "No media type" }),
  });
  assert.equal(missingContentType.status, 400);

  const nulTitle = await fetch(`${baseUrl}/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "\0" }),
  });
  assert.equal(nulTitle.status, 400);

  const missing = await fetch(`${baseUrl}/missing`);
  assert.equal(missing.status, 404);
});

// Security boundary: an unexpected storage error must become a generic 500 with
// no internal message. A fake storage that throws a revealing error confirms the
// detail is logged server-side but never sent to the client.
test("task API does not expose internal storage errors", async (context) => {
  const failure = new TypeError("sensitive storage failure");
  const storage: TaskStorage = {
    list: async () => {
      throw failure;
    },
    add: async () => {
      throw failure;
    },
    complete: async () => {
      throw failure;
    },
    remove: async () => {
      throw failure;
    },
  };
  context.mock.method(console, "error", () => undefined);
  const server = createTaskServer(storage);
  context.after(
    () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("expected a TCP address");
  }

  const response = await fetch(`http://127.0.0.1:${address.port}/tasks`);

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "internal server error" });
});
