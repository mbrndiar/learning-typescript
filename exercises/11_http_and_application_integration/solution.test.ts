import assert from "node:assert/strict";
import test from "node:test";

import { parseCreateTask } from "./solution.ts";

test("parseCreateTask returns a normalized title", () => {
  // The boundary should normalize user-supplied whitespace once, so callers
  // do not each need to remember to trim titles themselves.
  assert.deepEqual(parseCreateTask({ title: "  Build an API  " }), {
    title: "Build an API",
  });
});

test("parseCreateTask rejects malformed bodies", () => {
  // These cases represent client-controlled shapes, not TypeScript values:
  // non-objects, blank domain data, and extra fields must all stop here.
  assert.throws(() => parseCreateTask(null), /object/);
  assert.throws(() => parseCreateTask({ title: " " }), /non-empty/);
  assert.throws(() => parseCreateTask({ title: "Valid", done: false }), /only title/);
});
