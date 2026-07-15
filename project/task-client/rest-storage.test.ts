import assert from "node:assert/strict";
import test from "node:test";

import { TaskClient } from "./client.ts";
import { TaskNotFoundError } from "../task-core/storage.ts";
import { RestTaskStorage } from "./rest-storage.ts";

test("RestTaskStorage translates HTTP 404 into the storage error", async () => {
  const storage = new RestTaskStorage(
    new TaskClient(
      new URL("https://example.invalid"),
      async () => new Response("missing", { status: 404 }),
    ),
  );

  await assert.rejects(
    storage.remove(7),
    (error) => error instanceof TaskNotFoundError && error.taskId === 7,
  );
});
