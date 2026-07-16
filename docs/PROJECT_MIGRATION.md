# 🔁 Migrating from the Removed Task Project

The connected Task application was removed after its learning goals were
superseded by the comparative and idiomatic capstones. Its last repository state
is preserved at commit
[`74dfe53d5240c53a0596a35299ae8cfd9a55d51e`][legacy-project], under the
historical `project/` path. Use that immutable snapshot when auditing an old
deployment or studying an adapter; no current source imports it.

## Contract boundaries

| Historical area                                           | Durable destination or lesson                                                                                                                    |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `project/task-core` domain and injected CLI/storage seams | Reapply the capability pattern in the [idiomatic relay core](../capstones/idiomatic/solution/core/); do not copy Task types.                     |
| `project/task-manager` Node CLI composition               | Compare with the [idiomatic Node adapter](../capstones/idiomatic/solution/node/).                                                                |
| `project/task-client` Web `fetch` client                  | Reuse Web request/response and cancellation patterns where an HTTP client is actually required.                                                  |
| `project/task-api` Node HTTP and SQLite lifecycle         | Compare HTTP lifecycle with the idiomatic Node server and SQLite discipline with the [comparative capstone](../capstones/comparative/README.md). |
| `project/task-deno` permissions, files, and `Deno.serve`  | Compare with the [idiomatic Deno adapter](../capstones/idiomatic/solution/deno/).                                                                |
| `project/task-bun` files, `Bun.serve`, and `bun:sqlite`   | Compare with the [idiomatic Bun adapter](../capstones/idiomatic/solution/bun/).                                                                  |

The normative destinations are the
[`comparative-kv` specification](../capstones/comparative/spec/SPEC.md) and the
[event-relay specification](../capstones/idiomatic/SPEC.md). Historical Task
behavior must not be added to either contract unless that specification changes
deliberately.

## Data is not automatically migratable

- Task JSON documents contain task IDs, titles, and completion state.
- Task SQLite databases contain Task application tables.
- Comparative databases implement an exact versioned key/value schema.
- Relay logs contain a versioned JSON Lines event stream with contiguous relay
  sequences.

No file rename or schema-version bump converts one model into another. If a real
application still has Task data, define a separate export/import tool with an
explicit mapping, validation, dry run, backup, idempotency rule, and rollback
plan. Keep that operational migration outside both capstone contracts.

## Safe code migration sequence

1. Read the exact historical source from the pinned commit, not an unversioned
   branch.
2. Identify the behavior being retained: domain rule, capability seam, runtime
   adapter, test helper, or operational command.
3. Confirm the destination specification permits that behavior.
4. Port one seam without importing Task domain or storage types.
5. Add native tests for file, permission, process, server, database, and shutdown
   behavior; keep portable contracts runtime-neutral.
6. Run the focused destination checks, then the complete matrix:

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

7. Update links, setup commands, permission grants, and support claims.

## Removal record

The removal deleted the complete connected implementation and its tests, removed
its Node/Deno/Bun command and coverage entries, and dropped `proper-lockfile` plus
its type declarations. The current lockfiles and CI matrix cover only lessons,
exercises, and the two capstones.

Historical data is not deleted from an existing user checkout or deployment by
this source removal. Preserve and migrate it explicitly before replacing an old
Task installation.

[legacy-project]: https://github.com/mbrndiar/learning-typescript/tree/74dfe53d5240c53a0596a35299ae8cfd9a55d51e/project
