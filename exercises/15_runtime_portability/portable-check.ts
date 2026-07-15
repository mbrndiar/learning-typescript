import { findCompatibleRuntimes, type RuntimeProfile } from "./solution.ts";

function assertEqual(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
}

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

export function runPortableCheck(): void {
  assertEqual(findCompatibleRuntimes(profiles, { nativeBundler: true }), [
    "Deno",
    "Bun",
  ]);
}

runPortableCheck();
