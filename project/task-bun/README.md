# 🥟 Bun Task Application

## 🎯 Purpose

This adapter keeps the task model and orchestration in
[`task-core`](../task-core/) while making Bun-specific infrastructure explicit:

- `BunFileTaskStorage` reads with `Bun.file` and writes with `Bun.write`;
- `BunSqliteTaskStorage` uses `bun:sqlite`;
- the CLI delegates parsing and command behavior to the shared `cli-core`;
- the HTTP adapter uses `Bun.serve`, Web `Request`/`Response`, and the shared
  `TaskManager`; and
- the existing [`TaskClient`](../task-client/) talks to either the Node or Bun
  HTTP implementation through portable Web fetch.

## ▶️ Exact commands

Run the CLI with JSON file storage:

```bash
bun run project/task-bun/main.ts \
  --file project/task-bun/tasks.json add "Learn Bun storage"
bun run project/task-bun/main.ts \
  --file project/task-bun/tasks.json list
```

Start the Bun HTTP adapter with SQLite, then use the shared REST CLI from another
terminal:

```bash
PORT=8080 TASK_DATABASE=project/task-bun/tasks.sqlite \
  bun run project/task-bun/server-main.ts

bun run project/task-bun/main.ts \
  --backend rest --url http://127.0.0.1:8080 add "Use Bun.serve"
bun run project/task-bun/main.ts \
  --backend rest --url http://127.0.0.1:8080 list
```

Run focused tests, type checking, and the implemented build/compile smoke:

```bash
bun test project/task-bun
bun test --coverage project/task-bun
npm run typecheck:bun
npm run build:bun
npm run check:bun
```

## 💾 File durability and locking

Each mutation is serialized through an in-process promise queue. A save writes a
temporary sibling with `Bun.write`, then replaces the target with an atomic
`rename` from Bun's `node:fs/promises` compatibility layer. Readers therefore
do not observe a partially written JSON document. On Unix-like systems, new
files use mode `0600` and later writes preserve an existing restrictive mode.

This is intentionally **not cross-process locking parity** with the Node file
adapter. Two Bun processes, or two independent storage instances, can both read
the same old document and later overwrite one another. Atomic rename prevents a
torn file; it does not prevent lost updates. Use one storage owner, SQLite, or a
separate lock service when multiple processes write concurrently.

Directory creation, rename, cleanup, and path manipulation use Bun's Node
compatibility layer because Bun 1.3.14 does not expose equivalent Bun-native
filesystem metadata operations used by this adapter. The actual document
read/write path remains Bun-native.

## 🌐 HTTP behavior

The Bun server matches the Node API contract:

| Request                                      | Success              |
| -------------------------------------------- | -------------------- |
| `GET /tasks`                                 | `200` task array     |
| `POST /tasks` with JSON `{ "title": "..." }` | `201` task           |
| `PATCH /tasks/:id/complete`                  | `200` completed task |
| `DELETE /tasks/:id`                          | `204` empty body     |

Malformed JSON, missing JSON media type, invalid titles, and oversized bodies
receive `400`. Missing tasks and unknown routes receive `404`. Unexpected
storage errors are logged server-side and become the fixed response
`{"error":"internal server error"}`; internal exception text is never leaked.

`createBunTaskServer` starts a server only when called. `main.ts` and
`server-main.ts` use `import.meta.main`, so importing either entry point has no
process or server side effect.

## 🗄️ SQLite option

`BunSqliteTaskStorage` is synchronous internally because `bun:sqlite` is a
synchronous embedded driver, but it fulfills the asynchronous `TaskStorage`
interface. Statements use bound parameters, rows are validated at the adapter
boundary, and `close()` releases the connection. File-backed databases use mode
`0600` by default on Unix-like systems and preserve an existing database mode.

## ⚠️ Common mistakes

- claiming atomic rename also supplies cross-process mutual exclusion;
- calling `node:fs/promises` a Bun-native API;
- starting `Bun.serve` during module import;
- sharing a closed SQLite connection;
- reading an unlimited request body;
- returning raw storage errors to HTTP clients; and
- duplicating validation instead of going through `TaskManager`.

## ❓ Review questions

1. What failure does atomic rename prevent, and what race does it not prevent?
2. Why is the in-process queue attached to a storage instance?
3. Which project APIs are Bun-native, Web-standard, and Node-compatible?
4. Why does the HTTP adapter map only known errors to detailed responses?
5. How can the Web-based `TaskClient` be shared across runtime servers?

## 🔗 Related modules

- [Bun runtime lessons](../../lessons/14_bun_runtime/)
- [Bun runtime exercise](../../exercises/14_bun_runtime/)
- [Runtime-neutral task core](../task-core/)
- [Portable Web task client](../task-client/)
