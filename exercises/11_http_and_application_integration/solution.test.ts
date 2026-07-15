import assert from "node:assert/strict";
import test from "node:test";

import { parseCreateTask } from "./solution.ts";

test("parseCreateTask returns a normalized title", () => {
  assert.deepEqual(parseCreateTask({ title: "  Build an API  " }), {
    title: "Build an API",
  });
});

test("parseCreateTask rejects malformed bodies", () => {
  assert.throws(() => parseCreateTask(null), /object/);
  assert.throws(() => parseCreateTask({ title: " " }), /non-empty/);
  assert.throws(() => parseCreateTask({ title: "Valid", done: false }), /only title/);
});
