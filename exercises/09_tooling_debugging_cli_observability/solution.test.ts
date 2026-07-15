import assert from "node:assert/strict";
import test from "node:test";

import { parseArguments } from "./solution.ts";

test("parseArguments parses list output modes", () => {
  // list owns the optional output-mode flag; pinning both cases prevents a
  // future parser from treating flags as positional values.
  assert.deepEqual(parseArguments(["list"]), { kind: "list", json: false });
  assert.deepEqual(parseArguments(["list", "--json"]), {
    kind: "list",
    json: true,
  });
});

test("parseArguments normalizes an add title", () => {
  // Whitespace trimming happens at the CLI boundary so downstream code
  // receives the same command shape regardless of shell quoting.
  assert.deepEqual(parseArguments(["add", "  Learn CLI design  "]), {
    kind: "add",
    title: "Learn CLI design",
  });
});

test("parseArguments rejects malformed commands", () => {
  // These failures distinguish unsupported flags, missing real titles, and
  // unknown commands instead of allowing a success-shaped parse.
  assert.throws(() => parseArguments(["list", "--yaml"]), /list/);
  assert.throws(() => parseArguments(["add", "--json"]), /usage/);
  assert.throws(() => parseArguments(["add", ""]), /usage/);
  assert.throws(() => parseArguments(["remove", "1"]), /usage/);
});
