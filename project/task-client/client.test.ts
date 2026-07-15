import assert from "node:assert/strict";
import test from "node:test";

import { TaskClient, TaskClientError, type Fetch } from "./client.ts";

test("TaskClient sends JSON requests and validates responses", async () => {
  const requests: Request[] = [];
  const request: Fetch = async (input, init) => {
    requests.push(new Request(input, init));
    return Response.json(
      { id: 1, title: "Remote task", completed: false },
      { status: 201 },
    );
  };
  const client = new TaskClient(new URL("https://example.invalid/api/"), request);

  const task = await client.add("Remote task");

  assert.equal(task.id, 1);
  assert.equal(requests[0]?.url, "https://example.invalid/tasks");
  assert.equal(requests[0]?.method, "POST");
  assert.equal(requests[0]?.headers.get("content-type"), "application/json");
});

test("TaskClient rejects an error response with status context", async () => {
  const client = new TaskClient(
    new URL("https://example.invalid"),
    async () => new Response("missing", { status: 404 }),
  );

  await assert.rejects(
    client.complete(99),
    (error) =>
      error instanceof TaskClientError &&
      error.status === 404 &&
      error.message === "missing",
  );
});

test("TaskClient validates list response shapes", async () => {
  const client = new TaskClient(new URL("https://example.invalid"), async () =>
    Response.json({ not: "an array" }),
  );

  await assert.rejects(client.list(), /array/);
});
