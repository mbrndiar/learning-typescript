import assert from "node:assert/strict";
import test from "node:test";

import { MemoryTaskStorage } from "../test-support/memory-storage.ts";
import { TaskManager } from "./manager.ts";

// Proves validation lives in the manager, not the backend: even with an
// in-memory store, blank/NUL titles and non-positive ids are rejected before
// they reach storage, so no backend can accidentally accept invalid input.
test("TaskManager validates titles and identifiers", async () => {
  const manager = new TaskManager(new MemoryTaskStorage());

  const task = await manager.add("  Learn TypeScript  ");
  assert.equal(task.title, "Learn TypeScript");
  assert.throws(() => manager.add(" "), /blank/);
  assert.throws(() => manager.add("\0"), /NUL/);
  assert.throws(() => manager.complete(0), /positive integer/);
});
