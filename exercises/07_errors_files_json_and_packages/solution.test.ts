import assert from "node:assert/strict";
import test from "node:test";

import { parseTasks } from "./solution.ts";

test("parseTasks validates and normalizes tasks", () => {
  assert.deepEqual(
    parseTasks([{ id: 1, title: "  Learn boundaries  ", done: false }]),
    [{ id: 1, title: "Learn boundaries", done: false }],
  );
});

test("parseTasks rejects malformed input", () => {
  assert.throws(() => parseTasks({}), /array/);
  assert.throws(
    () => parseTasks([{ id: 0, title: "Invalid", done: false }]),
    /positive integer/,
  );
  assert.throws(() => parseTasks([{ id: 1, title: " ", done: false }]), /non-empty/);
});
