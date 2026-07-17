import assert from "node:assert/strict";
import test from "node:test";

import { parseCreateTask, startTaskServer, type Task } from "./solution.ts";

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
