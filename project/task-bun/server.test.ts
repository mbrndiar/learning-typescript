import { expect, spyOn, test } from "bun:test";

import { TaskClient, TaskClientError } from "../task-client/client.ts";
import type { TaskStorage } from "../task-core/storage.ts";
import { BunSqliteTaskStorage } from "./bun-sqlite-storage.ts";
import { createBunTaskHandler, createBunTaskServer } from "./server.ts";

test("Bun HTTP adapter supports the shared client lifecycle", async () => {
  const storage = new BunSqliteTaskStorage();
  const server = createBunTaskServer(storage);
  try {
    const client = new TaskClient(server.url);
    const created = await client.add("Connected Bun task");
    expect(await client.list()).toEqual([created]);

    expect(await client.complete(created.id)).toEqual({
      ...created,
      completed: true,
    });
    await client.remove(created.id);
    expect(await client.list()).toEqual([]);
    try {
      await client.complete(created.id);
      throw new Error("expected a missing task response");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(TaskClientError);
      expect((error as TaskClientError).status).toBe(404);
    }
  } finally {
    await server.stop(true);
    storage.close();
  }
});

test("Bun HTTP adapter matches validation and status behavior", async () => {
  const storage = new BunSqliteTaskStorage();
  const server = createBunTaskServer(storage);
  try {
    const malformed = await fetch(new URL("/tasks", server.url), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    expect(malformed.status).toBe(400);

    const missingContentType = await fetch(new URL("/tasks", server.url), {
      method: "POST",
      body: JSON.stringify({ title: "No media type" }),
    });
    expect(missingContentType.status).toBe(400);

    const badShape = await fetch(new URL("/tasks", server.url), {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ title: "\0" }),
    });
    expect(badShape.status).toBe(400);

    const oversized = await fetch(new URL("/tasks", server.url), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "x".repeat(65 * 1024) }),
    });
    expect(oversized.status).toBe(400);

    const unknown = await fetch(new URL("/missing", server.url));
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toEqual({ error: "not found" });
  } finally {
    await server.stop(true);
    storage.close();
  }
});

test("Bun HTTP adapter never leaks unexpected storage errors", async () => {
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
  const log = spyOn(console, "error").mockImplementation(() => undefined);
  const server = createBunTaskServer(storage);
  try {
    const response = await fetch(new URL("/tasks", server.url));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "internal server error" });
    expect(log).toHaveBeenCalled();
  } finally {
    log.mockRestore();
    await server.stop(true);
  }
});

test("Bun HTTP adapter cancels chunked bodies as soon as they exceed 64 KiB", async () => {
  const storage = new BunSqliteTaskStorage();
  let pulls = 0;
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulls += 1;
      controller.enqueue(new Uint8Array(32 * 1024));
      if (pulls === 10) {
        controller.close();
      }
    },
    cancel() {
      cancelled = true;
    },
  });

  try {
    const response = await createBunTaskHandler(storage)(
      new Request("http://127.0.0.1/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "request body is too large" });
    expect(cancelled).toBe(true);
    expect(pulls).toBeLessThan(10);
  } finally {
    storage.close();
  }
});
