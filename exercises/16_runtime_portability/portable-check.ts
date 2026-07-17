import { findCompatibleRuntimes, type RuntimeProfile } from "./solution.ts";

// This file is a framework-free conformance check. If it runs under Node,
// Deno, and Bun, the exercised solution path avoided runtime-specific test
// APIs and imports.
function assertEqual(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
}

// The same data is used across runtimes so a passing check proves the selector
// depends only on ordinary ECMAScript behavior.
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

// CONTRACT: exercise one portability claim without relying on node:test,
// Deno.test, or bun:test, which would make the check runtime-specific.
export function runPortableCheck(): void {
  assertEqual(findCompatibleRuntimes(profiles, { nativeBundler: true }), [
    "Deno",
    "Bun",
  ]);
}

runPortableCheck();
