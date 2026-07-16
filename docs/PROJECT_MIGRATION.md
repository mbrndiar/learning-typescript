# 🔁 Migrating from the Retained Task Project

The connected [`project/`](../project/README.md) application predates the two
formal capstones. It remains executable teaching material and a source of
adapter patterns. This guide defines how to reuse or retire it without treating
the three unrelated storage contracts as interchangeable.

## Contract boundaries

| Existing area                                             | Durable destination or lesson                                                                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `project/task-core` domain and injected CLI/storage seams | Reapply the capability pattern in the [idiomatic relay core](../capstones/idiomatic/solution/core/); do not copy Task types.                     |
| `project/task-manager` Node CLI composition               | Compare with the [idiomatic Node adapter](../capstones/idiomatic/solution/node/).                                                                |
| `project/task-client` Web `fetch` client                  | Reuse Web request/response and cancellation patterns where an HTTP client is actually required.                                                  |
| `project/task-api` Node HTTP and SQLite lifecycle         | Compare HTTP lifecycle with the idiomatic Node server and SQLite discipline with the [comparative capstone](../capstones/comparative/README.md). |
| `project/task-deno` permissions, files, and `Deno.serve`  | Compare with the [idiomatic Deno adapter](../capstones/idiomatic/solution/deno/).                                                                |
| `project/task-bun` files, `Bun.serve`, and `bun:sqlite`   | Compare with the [idiomatic Bun adapter](../capstones/idiomatic/solution/bun/).                                                                  |

The normative destinations are the
[`comparative-kv` specification](../capstones/comparative/spec/SPEC.md) and the
[event-relay specification](../capstones/idiomatic/SPEC.md). Existing Task
behavior must not be added to either contract unless that specification changes
deliberately.

## Data is not automatically migratable

- Task JSON documents contain task IDs, titles, and completion state.
- Task SQLite databases contain Task application tables.
- Comparative databases implement an exact versioned key/value schema.
- Relay logs contain a versioned JSON Lines event stream with contiguous relay
  sequences.

No file rename or schema-version bump converts one model into another. If a
real application needs old Task data, define a separate export/import tool with
an explicit mapping, validation, dry run, backup, idempotency rule, and rollback
plan. Keep that operational migration outside both capstone contracts.

## Safe code migration sequence

1. Identify the behavior being retained: domain rule, capability seam, runtime
   adapter, test helper, or operational command.
2. Confirm the destination specification permits that behavior.
3. Port one seam without importing Task domain or storage types.
4. Add native tests for file, permission, process, server, database, and
   shutdown behavior; keep portable contracts runtime-neutral.
5. Run the focused destination checks, then the complete matrix:

   ```bash
   npm run typecheck:capstones:node
   CAPSTONE_IMPLEMENTATION=solution npm run test:capstones:node
   CAPSTONE_IMPLEMENTATION=solution npm run test:capstone:idiomatic:deno
   CAPSTONE_IMPLEMENTATION=solution npm run test:capstone:idiomatic:bun
   npm run check
   npm run coverage
   npm run audit:node
   npm run check:deno
   npm run check:bun
   npm run portability
   ```

6. Update links, setup commands, permission grants, and support claims.
7. Keep `project/` intact unless a dedicated removal change also updates
   lessons, exercises, tests, scripts, dependencies, and migration notes.

## Eventual retirement checklist

A future removal is safe only when:

- no lesson, exercise, guide, script, test, or configuration includes
  `project/`;
- equivalent learning goals remain covered by the two capstones;
- any required Task data has an independently tested export/import path;
- `proper-lockfile` and `@types/proper-lockfile` have no remaining imports and
  can be removed from both lockfiles;
- Node, Deno, Bun, coverage, audit, link, build/compile, and conformance checks
  pass after the removal; and
- release notes state the compatibility and data-retention impact.

Until all criteria are addressed in one deliberate change, retaining
`project/` is the stable repository policy.
