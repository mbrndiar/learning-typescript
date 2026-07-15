import type { TaskStorage } from "../task-core/storage.ts";
import { TaskClient, TaskClientError } from "../task-client/client.ts";
import { serveTaskApi } from "./server.ts";
import { assert, assertEquals, MemoryTaskStorage } from "./test-support.ts";

interface RunningServer {
  readonly url: URL;
  close(): Promise<void>;
}

// Helper that starts the server on an ephemeral port and returns a close() that
// aborts via the AbortController and awaits server.finished, so each test tears
// down deterministically without leaking a listener.
function startServer(
  storage: TaskStorage,
  logError?: (error: unknown) => void,
): RunningServer {
  const controller = new AbortController();
  const server = serveTaskApi(storage, {
    hostname: "127.0.0.1",
    port: 0,
    signal: controller.signal,
    onListen: () => undefined,
    logError,
  });
  const address = server.addr;
  if (address.transport !== "tcp") {
    throw new Error("expected a TCP address");
  }
  return {
    url: new URL(`http://127.0.0.1:${address.port}`),
    async close() {
      controller.abort();
      await server.finished;
    },
  };
}

const localNetwork = { net: ["127.0.0.1"] };

// End-to-end over a loopback socket and the shared TaskClient, confirming the
// Deno server speaks the same protocol as the other runtimes' servers.
Deno.test({
  name: "Deno task API supports the complete HTTP lifecycle",
  permissions: localNetwork,
  fn: async () => {
    const server = startServer(new MemoryTaskStorage());
    try {
      const client = new TaskClient(server.url);
      const created = await client.add("Connected task");
      assertEquals(await client.list(), [created]);
      assertEquals((await client.complete(created.id)).completed, true);
      await client.remove(created.id);
      assertEquals(await client.list(), []);

      let missing: unknown;
      try {
        await client.complete(created.id);
      } catch (error: unknown) {
        missing = error;
      }
      assert(missing instanceof TaskClientError && missing.status === 404);
    } finally {
      await server.close();
    }
  },
});

// Every rejection path at once: malformed JSON, missing content type, empty
// body, a NUL title that fails domain validation, an oversized body past the
// cap, and an unknown route. Each maps to the correct 4xx, so a naive server
// that skipped any check would fail here. net is scoped to loopback.
Deno.test({
  name: "Deno task API enforces JSON, body limits, and local routing",
  permissions: localNetwork,
  fn: async () => {
    const server = startServer(new MemoryTaskStorage());
    try {
      const malformed = await fetch(new URL("/tasks", server.url), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      });
      assertEquals(malformed.status, 400);
      assertEquals(await malformed.json(), { error: "request body must contain valid JSON" });

      const missingContentType = await fetch(new URL("/tasks", server.url), {
        method: "POST",
        body: JSON.stringify({ title: "No media type" }),
      });
      assertEquals(missingContentType.status, 400);

      const empty = await fetch(new URL("/tasks", server.url), {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      assertEquals(empty.status, 400);
      assertEquals(await empty.json(), { error: "request body is required" });

      const nulTitle = await fetch(new URL("/tasks", server.url), {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ title: "\0" }),
      });
      assertEquals(nulTitle.status, 400);
      assertEquals(await nulTitle.json(), { error: "title must not contain NUL characters" });

      const oversized = await fetch(new URL("/tasks", server.url), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "x".repeat(64 * 1024 + 1),
      });
      assertEquals(oversized.status, 400);
      assertEquals(await oversized.json(), { error: "request body is too large" });

      const missing = await fetch(new URL("/missing?route=tasks", server.url));
      assertEquals(missing.status, 404);
      assertEquals(await missing.json(), { error: "not found" });
    } finally {
      await server.close();
    }
  },
});

// Security boundary: an internal storage error is logged server-side (captured
// here) but the client only ever sees a generic 500 with no sensitive detail.
Deno.test({
  name: "Deno task API logs but never leaks internal errors",
  permissions: localNetwork,
  fn: async () => {
    const failure = new TypeError("sensitive storage failure");
    const storage: TaskStorage = {
      list: () => Promise.reject(failure),
      add: () => Promise.reject(failure),
      complete: () => Promise.reject(failure),
      remove: () => Promise.reject(failure),
    };
    const logged: unknown[] = [];
    const server = startServer(storage, (error) => logged.push(error));
    try {
      const response = await fetch(new URL("/tasks", server.url));
      const text = await response.text();
      assertEquals(response.status, 500);
      assertEquals(JSON.parse(text), { error: "internal server error" });
      assert(!text.includes("sensitive storage failure"));
      assertEquals(logged, [failure]);
    } finally {
      await server.close();
    }
  },
});
