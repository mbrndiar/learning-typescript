# 🦕 Deno Task Application

## 🧭 Architecture

- `DenoFileTaskStorage` adapts the runtime-neutral task core to Deno file APIs.
- `main.ts` uses the shared CLI core and the portable Web-fetch `TaskClient`.
- `server.ts` maps `Deno.serve` Web requests to the shared `TaskManager`.
- `server-main.ts` is the executable HTTP entry point.

All entry points use `import.meta.main`, so importing them has no side effects.
The Deno adapter uses Deno-native and Web APIs; `node:` compatibility imports
are not used here.

## ▶️ File CLI

Keep state in one dedicated directory and grant only that directory:

```bash
deno run \
  --allow-read=.task-data \
  --allow-write=.task-data \
  project/task-deno/main.ts \
  --file .task-data/tasks.json add "Learn Deno"
```

For the REST backend, the CLI needs network access but no file access:

```bash
deno run \
  --allow-net=127.0.0.1:8080 \
  project/task-deno/main.ts \
  --backend rest --url http://127.0.0.1:8080 list
```

## 🌐 HTTP server

```bash
deno run \
  --allow-net=127.0.0.1:8080 \
  --allow-read=.task-data \
  --allow-write=.task-data \
  project/task-deno/server-main.ts \
  --file .task-data/tasks.json --hostname 127.0.0.1 --port 8080
```

The adapter matches the Node API routes: `GET /tasks`, `POST /tasks`, `PATCH /tasks/:id/complete`,
and `DELETE /tasks/:id`. It requires `application/json`, limits request bodies to 64 KiB, emits JSON
with a UTF-8 content type, maps validation failures to 400, missing tasks to 404, and hides internal
error details behind a stable 500 response.

## 💾 Atomic storage behavior

Writes serialize inside one `DenoFileTaskStorage` instance. Each update writes a same-directory
temporary file, preserves an existing Unix mode, and atomically renames the temporary file over the
destination. Readers therefore do not see a partially written JSON document.

This adapter intentionally has **no cross-process lock**. Two Deno processes writing the same file
can lose an update. Use one process, the HTTP server, or a storage engine with transactional locking
when multiple processes must write.

## 🧪 Validate

The root task grants file access only to disposable repository-local test data
and network access only to loopback:

```bash
deno task fmt:check
deno task lint
deno task typecheck
deno task test
deno task course
deno task docs
deno task compile
deno task check

# Equivalent package wrapper
npm run check:deno
```

## ⚠️ Common mistakes

- granting `-A` instead of one state directory and one loopback listener;
- starting a server at import time;
- trusting `content-length` without enforcing the streamed byte count too;
- returning raw storage errors to clients; and
- assuming atomic rename also provides cross-process serialization.
