# 🔗 Connected Task Manager

The capstone combines one shared domain with runtime-specific programs:

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
The Node JSON adapter uses `proper-lockfile` for cross-process coordination.
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
deno run --allow-read=tasks.json --allow-write=tasks.json \
  project/task-deno/main.ts add "Deno task"

# Bun, after module 14 setup
bun run project/task-bun/main.ts add "Bun task"
```

## 🧩 Staged extensions

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
