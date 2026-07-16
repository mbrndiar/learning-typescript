// runtime-conformance is a single portable smoke test run identically under
// Node, Deno, and Bun. It deliberately avoids any runtime-specific test
// framework (node:test, Deno.test, bun:test) and uses only shared APIs plus a
// hand-rolled assert, so the exact same file proves the relay domain, portable
// async storage, capability filtering, and Web Crypto behave the same everywhere.
import {
  InMemoryEventLog,
  parseEvent,
} from "../capstones/idiomatic/solution/core/index.ts";
import {
  findCompatibleRuntimes,
  type RuntimeProfile,
} from "../exercises/15_runtime_portability/solution.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const parsed = parseEvent({
  kind: "metric",
  id: "conformance-1",
  source: " portability ",
  observedAt: "2026-07-16T10:00:00+02:00",
  name: "runtime.check",
  value: -0,
  tags: { runtime: "portable" },
});
assert(parsed.ok, "portable relay event must parse");
assert(parsed.event.kind === "metric", "metric variant must remain discriminated");
assert(
  parsed.event.observedAt === "2026-07-16T08:00:00.000Z",
  "timestamp normalization must be identical",
);
assert(!Object.is(parsed.event.value, -0), "negative zero must normalize");
const log = new InMemoryEventLog();
const stored = await log.append(parsed.event);
assert(stored.sequence === 1, "portable event log must assign sequence one");
const replayed = [];
for await (const event of log.replay({ kind: "metric", limit: 1 })) {
  replayed.push(event);
}
assert(replayed.length === 1, "portable replay must preserve the event");
await log.close();

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

assert(
  findCompatibleRuntimes(profiles, {
    nativeBundler: true,
    nativeSqlite: true,
  }).join(",") === "Bun",
  "Runtime capability filtering must be deterministic",
);

const digest = await crypto.subtle.digest(
  "SHA-256",
  new TextEncoder().encode("learning-typescript"),
);
assert(digest.byteLength === 32, "Web Crypto SHA-256 must produce 32 bytes");

// Detect the host runtime from its global so the pass message names it; this is
// the only runtime-specific branch and it is observational, not behavioral.
const runtime = Reflect.has(globalThis, "Deno")
  ? "Deno"
  : Reflect.has(globalThis, "Bun")
    ? "Bun"
    : "Node.js";

console.log(`${runtime} conformance passed`);
