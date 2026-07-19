import assert from "node:assert/strict";
import { once } from "node:events";
import { connect, type Socket } from "node:net";
import test from "node:test";

import type { Task } from "./exercise.ts";
import { selectExerciseTarget } from "../test-target.ts";

const implementation =
  selectExerciseTarget(process.env.EXERCISE_IMPLEMENTATION) === "exercise"
    ? await import("./exercise.ts")
    : await import("./solution.ts");
const { parseCreateTask, startTaskServer } = implementation;

async function openIncompleteRequest(url: string): Promise<Socket> {
  const { port } = new URL(url);
  const socket = connect({ host: "127.0.0.1", port: Number(port) });
  socket.on("error", () => undefined);
  await once(socket, "connect");
  socket.write(
    [
      "POST /tasks HTTP/1.1",
      "Host: 127.0.0.1",
      "Content-Type: application/json",
      "Content-Length: 32",
      "",
      '{"title":"only part',
    ].join("\r\n"),
  );
  return socket;
}

test("parseCreateTask validates the decoded REST representation", () => {
  assert.deepEqual(parseCreateTask({ title: "  Build an API  " }), {
    title: "Build an API",
  });
  assert.throws(() => parseCreateTask(null), /object/);
  assert.throws(() => parseCreateTask({ title: " " }), /non-empty/);
  assert.throws(() => parseCreateTask({ title: "Valid", done: false }), /only title/);
});

test("loopback REST server creates validated tasks and shuts down", async () => {
  const server = await startTaskServer();
  try {
    const created = await fetch(`${server.url}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "  Learn REST boundaries  " }),
    });
    assert.equal(created.status, 201);
    assert.deepEqual((await created.json()) as Task, {
      id: 1,
      title: "Learn REST boundaries",
      done: false,
    });

    const listed = await fetch(`${server.url}/tasks`);
    assert.equal(listed.status, 200);
    assert.deepEqual(await listed.json(), {
      tasks: [{ id: 1, title: "Learn REST boundaries", done: false }],
    });

    const malformed = await fetch(`${server.url}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: " ", ignored: true }),
    });
    assert.equal(malformed.status, 400);
    assert.deepEqual(await malformed.json(), {
      error: "request body must contain only title",
    });
  } finally {
    await server.close();
  }
});

test(
  "shutdown terminates an incomplete request at its bounded deadline",
  { timeout: 1_000 },
  async () => {
    const server = await startTaskServer({ shutdownGracePeriodMs: 0 });
    const socket = await openIncompleteRequest(server.url);
    const socketClosed = new Promise<void>((resolve) => {
      socket.once("close", () => resolve());
    });

    try {
      await server.close();
      await socketClosed;
    } finally {
      socket.destroy();
      await server.close();
    }
  },
);

test("concurrent close calls share one graceful shutdown", async () => {
  const server = await startTaskServer();
  const first = server.close();
  const second = server.close();

  assert.strictEqual(first, second);
  await Promise.all([first, second]);
  await server.close();
});
