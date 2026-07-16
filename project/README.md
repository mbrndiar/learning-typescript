# 🔗 Connected Task Manager

## 📌 Status

This is the retained predecessor to the two formal capstones. Modules 12-15 use
it to compare one Task domain across runtime adapters, and its tests remain part
of the repository checks. It is not a third capstone, and there is no automatic
data migration from Task documents/databases to the comparative key/value store
or idiomatic event relay.

The project combines one shared domain with runtime-specific programs:

- `task-core` owns Task validation, storage semantics, document parsing, manager
  coordination, and backend-independent CLI execution.
- `task-manager` provides the Node.js CLI and JSON/REST storage selection.
- `task-client` provides a typed HTTP client and the portable
  `rest-storage.ts` adapter used by all three CLIs.
- `task-api` exposes tasks through `node:http` and `node:sqlite`.
- `task-deno` adds Deno files, permissions, CLI, tests, and `Deno.serve`.
- `task-bun` adds Bun files, CLI, tests, `Bun.serve`, and `bun:sqlite`.

```text
Shared Task core
├── Node.js -> JSON file or REST -> node:http -> node:sqlite
├── Deno    -> JSON file or REST -> Deno.serve
└── Bun     -> JSON file or REST -> Bun.serve -> bun:sqlite
```

The implementation deliberately avoids a web framework so routing, validation,
cancellation, persistence, and graceful shutdown remain visible.
The Node JSON adapter uses
[`proper-lockfile`](https://github.com/moxystudio/node-proper-lockfile) for
cross-process coordination.
Deno uses native file APIs. Bun uses `Bun.file`/`Bun.write` plus Node-compatible
rename and directory APIs. Both use atomic replacement and in-process
serialization without cross-process locking.

## ▶️ Run the connected application

```bash
# Local JSON storage
npm run lesson -- project/task-manager/main.ts add "Local task"
npm run lesson -- project/task-manager/main.ts list

# Start the SQLite-backed API in one terminal
npm run lesson -- project/task-api/main.ts

# Use the REST backend in another terminal
npm run lesson -- project/task-manager/main.ts \
  --backend rest --url http://127.0.0.1:8080 add "Remote task"

# Deno, after module 13 setup
deno run --allow-read=.task-data --allow-write=.task-data \
  project/task-deno/main.ts \
  --file .task-data/tasks.json add "Deno task"

# Bun, after module 14 setup
bun run project/task-bun/main.ts \
  --file .task-data/tasks.json add "Bun task"
```

The Deno grant names the state directory because the atomic writer creates a
temporary sibling before renaming it over the final file.

## 🔁 Reuse and migration

Reuse patterns, not incompatible domain models:

- `task-core` demonstrates a runtime-neutral domain, injected storage, and CLI
  command boundary; the idiomatic relay applies those seams to events.
- `task-api`, `task-deno`, and `task-bun` demonstrate native server, file,
  lifecycle, and permission adapters.
- `task-client` demonstrates a portable Web `fetch` boundary.
- the comparative capstone separately demonstrates a frozen Node/SQLite
  contract and must not absorb Task-specific behavior.

Follow [`docs/PROJECT_MIGRATION.md`](../docs/PROJECT_MIGRATION.md) for the
old-to-new ownership map, validation sequence, data incompatibilities,
dependency cleanup, and eventual retirement criteria. Do not delete this tree
as an incidental part of capstone work.

## 🧩 Optional extensions

1. Add a `show <id>` command.
2. Add title search and completed/pending filters.
3. Add priorities with a file and database schema migration.
4. Add due dates with explicit UTC serialization.
5. Add an in-memory adapter and run the shared storage contract against it.
6. Add optimistic concurrency with a task version.
7. Propagate request IDs and structured logs through CLI, client, and API.
8. Add equivalent request IDs to all three HTTP adapters.
9. Design a portable cross-process lock contract and evaluate its tradeoffs.
10. Add a Deno SQLite package adapter and compare it with the native Node and
    Bun implementations.
