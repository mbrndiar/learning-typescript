# 🔁 Historical Task Project and the Current Applied Project

This repository has two different Task application histories. Do not treat them
as the same project.

- **Historical removed application:** the connected application formerly under
  `project/`, preserved only in commit
  [`74dfe53d5240c53a0596a35299ae8cfd9a55d51e`][legacy-project]. It remains
  useful for auditing an old checkout or deployment.
- **Current compact applied project:** [`projects/tasks/`](../projects/tasks/README.md).
  It is a required, portable learning project after module 16 and before the
  final capstones. It has one strict core, native Node.js/Deno/Bun adapters,
  SQLite and versioned Markdown repositories, an OpenAPI 3.1 contract, and
  finite interoperability evidence.

The current project does not restore the removed application's deployment,
framework choices, or data-import promise. It is not a third capstone.

## What belongs where

| Historical concern                                                           | Current learning destination                                            |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Task values, validation, strict JSON, CLI, Fetch, HTTP status/error contract | [Current Tasks core and contract](../projects/tasks/docs/SPEC.md)       |
| Node `node:sqlite` lifecycle and atomic file updates                         | [Current Tasks Node adapter](../projects/tasks/solution/runtimes/node/) |
| Deno permissions, `Deno.serve`, and SQLite FFI                               | [Current Tasks Deno adapter](../projects/tasks/solution/runtimes/deno/) |
| Bun server, files, and `bun:sqlite`                                          | [Current Tasks Bun adapter](../projects/tasks/solution/runtimes/bun/)   |
| Frozen key/value schema and real contention                                  | [comparative capstone](../capstones/comparative/README.md)              |
| Portable event stream, cancellation, and runtime adapters                    | [event-relay capstone](../capstones/idiomatic/README.md)                |

The Tasks contract is not a license to add Task behavior to either capstone.
The capstone specifications remain normative and intentionally independent.

## Data and operational migration

Do not rename files or assume a schema bump converts historical data. The
current Tasks project has no automatic importer for the removed application's
data. Its SQLite schema and Markdown v1 format are specified for the current
project; capstone databases and relay logs are different models entirely.

For a real deployment, keep the old data safe and build a separate migration
tool with:

1. an explicit source-to-target field mapping;
2. validation and a dry-run mode;
3. an immutable backup and a rollback plan;
4. idempotency rules and a reconciliation report; and
5. focused tests against copied, non-production fixtures.

Keep that operational tool outside the applied-project and capstone contracts.

## Current verification sequence

The guided defaults select `starter`; use `solution` for the complete
reference. The Deno commands use the frozen root `deno.lock` and only the
scoped grants declared in `deno.json`.

```bash
TASKS_IMPLEMENTATION=solution npm run check:tasks:node
TASKS_IMPLEMENTATION=solution deno task tasks:check
TASKS_IMPLEMENTATION=solution npm run check:tasks:bun
npm run portability:tasks
npm run test:tasks:interoperability

CAPSTONE_IMPLEMENTATION=solution npm run test:capstones:node
CAPSTONE_IMPLEMENTATION=solution npm run test:capstone:idiomatic:deno
CAPSTONE_IMPLEMENTATION=solution npm run test:capstone:idiomatic:bun
npm run coverage
npm run portability
```

The Tasks interoperability command deliberately remains separate from the
portable core smoke: it starts six runtime/server/backend cells and nine
cross-runtime SQLite client/server cells.

## Historical reference rules

1. Read the exact pinned snapshot, not an unversioned branch.
2. Identify the behavior being studied before copying a pattern.
3. Confirm that the current Tasks specification or destination capstone permits
   that behavior.
4. Port one narrow seam at a time; do not import the historical domain or
   persistence types into a capstone.
5. Update commands, permissions, OpenAPI assertions, links, and tests with any
   deliberate current-contract change.

[legacy-project]: https://github.com/mbrndiar/learning-typescript/tree/74dfe53d5240c53a0596a35299ae8cfd9a55d51e/project
