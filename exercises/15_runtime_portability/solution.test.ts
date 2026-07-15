import assert from "node:assert/strict";
import test from "node:test";

import { findCompatibleRuntimes, type RuntimeProfile } from "./solution.ts";

const profiles: readonly RuntimeProfile[] = [
  {
    name: "Node.js",
    defaultDenyPermissions: false,
    nodeCompatibility: "reference",
    nativeBundler: false,
    nativeSqlite: true,
  },
  {
    name: "Deno",
    defaultDenyPermissions: true,
    nodeCompatibility: "high",
    nativeBundler: true,
    nativeSqlite: false,
  },
  {
    name: "Bun",
    defaultDenyPermissions: false,
    nodeCompatibility: "high",
    nativeBundler: true,
    nativeSqlite: true,
  },
];

test("findCompatibleRuntimes applies every requested capability", () => {
  assert.deepEqual(
    findCompatibleRuntimes(profiles, {
      nativeBundler: true,
      nativeSqlite: true,
    }),
    ["Bun"],
  );
  assert.deepEqual(
    findCompatibleRuntimes(profiles, {
      defaultDenyPermissions: true,
    }),
    ["Deno"],
  );
});

test("findCompatibleRuntimes preserves input order and handles no requirements", () => {
  assert.deepEqual(findCompatibleRuntimes(profiles, {}), ["Node.js", "Deno", "Bun"]);
  assert.deepEqual(
    findCompatibleRuntimes(profiles, { referenceNodeCompatibility: true }),
    ["Node.js"],
  );
});
