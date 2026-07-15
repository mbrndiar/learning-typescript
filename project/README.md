# 🔗 Connected Task Manager

The capstone combines the course in three connected programs:

- `task-manager` owns the domain model, CLI, and selectable storage.
- `task-client` provides a typed HTTP client.
- `task-api` exposes tasks over HTTP and persists them in SQLite.

```text
Task Manager CLI -> Manager -> Storage
                             |-> JSON file
                             `-> REST client -> HTTP API -> SQLite
```

The implementation deliberately avoids a web framework so routing, validation,
cancellation, persistence, and graceful shutdown remain visible.
The JSON adapter uses `proper-lockfile` for cross-process coordination; the
remaining application code relies on runtime APIs.

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
```

## 🧩 Staged extensions

1. Add a `show <id>` command.
2. Add title search and completed/pending filters.
3. Add priorities with a file and database schema migration.
4. Add due dates with explicit UTC serialization.
5. Add an in-memory adapter and run the shared storage contract against it.
6. Add optimistic concurrency with a task version.
7. Propagate request IDs and structured logs through CLI, client, and API.
8. Port the domain and HTTP client to Deno or Bun while keeping SQLite
   explicitly Node-specific.
