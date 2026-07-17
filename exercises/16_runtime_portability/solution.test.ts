import assert from "node:assert/strict";
import test from "node:test";

import { findCompatibleRuntimes, type RuntimeProfile } from "./solution.ts";

// The fixture gives each runtime a different mix of capabilities, so the
// selector must intersect requirements instead of matching one headline trait.
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

// This scenario asks for two capabilities at once to prove that compatibility
// means satisfying every requested boundary, not any single boundary.
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

// Order is part of the contract because callers may pre-rank runtimes by
// policy, support, or deployment preference before filtering.
test("findCompatibleRuntimes preserves input order and handles no requirements", () => {
  assert.deepEqual(findCompatibleRuntimes(profiles, {}), ["Node.js", "Deno", "Bun"]);
  assert.deepEqual(
    findCompatibleRuntimes(profiles, { referenceNodeCompatibility: true }),
    ["Node.js"],
  );
});
