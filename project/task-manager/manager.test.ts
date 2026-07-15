import assert from "node:assert/strict";
import test from "node:test";

import { MemoryTaskStorage } from "../test-support/memory-storage.ts";
import { TaskManager } from "./manager.ts";

test("TaskManager validates titles and identifiers", async () => {
  const manager = new TaskManager(new MemoryTaskStorage());

  const task = await manager.add("  Learn TypeScript  ");
  assert.equal(task.title, "Learn TypeScript");
  assert.throws(() => manager.add(" "), /blank/);
  assert.throws(() => manager.add("\0"), /NUL/);
  assert.throws(() => manager.complete(0), /positive integer/);
});
