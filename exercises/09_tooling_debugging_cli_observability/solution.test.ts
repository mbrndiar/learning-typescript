import assert from "node:assert/strict";
import test from "node:test";

import { parseArguments } from "./solution.ts";

test("parseArguments parses list output modes", () => {
  assert.deepEqual(parseArguments(["list"]), { kind: "list", json: false });
  assert.deepEqual(parseArguments(["list", "--json"]), {
    kind: "list",
    json: true,
  });
});

test("parseArguments normalizes an add title", () => {
  assert.deepEqual(parseArguments(["add", "  Learn CLI design  "]), {
    kind: "add",
    title: "Learn CLI design",
  });
});

test("parseArguments rejects malformed commands", () => {
  assert.throws(() => parseArguments(["list", "--yaml"]), /list/);
  assert.throws(() => parseArguments(["add", "--json"]), /usage/);
  assert.throws(() => parseArguments(["add", ""]), /usage/);
  assert.throws(() => parseArguments(["remove", "1"]), /usage/);
});
