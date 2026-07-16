# 🌐 Node.js, Deno, and Bun Runtime Guide

The language and type system are only part of a server-side program. Files,
processes, permissions, packages, tests, servers, databases, and executable
distribution belong to the runtime and its tools.

This course uses Node.js first, then teaches Deno and Bun as complete runtime
tracks before testing migration and portability.

## 🧭 Capability overview

| Concern               | Node.js                              | Deno                             | Bun                                 |
| --------------------- | ------------------------------------ | -------------------------------- | ----------------------------------- |
| Course baseline       | 24 LTS / 26 Current                  | 2.9.3                            | 1.3.14                              |
| Project configuration | `package.json`, `tsconfig.node.json` | `deno.json`                      | `package.json`, `tsconfig.bun.json` |
| Lockfile              | `package-lock.json`                  | `deno.lock`                      | `bun.lock`                          |
| TypeScript execution  | native stripping or `tsx`            | native                           | native transpilation                |
| Static checking       | `tsc`                                | `deno check`                     | `tsc`                               |
| Default permissions   | process authority                    | sensitive I/O denied             | process authority                   |
| Native test API       | `node:test`                          | `Deno.test`                      | `bun:test`                          |
| Native HTTP API       | `node:http`                          | `Deno.serve`                     | `Bun.serve`                         |
| Native SQLite         | `node:sqlite`                        | none in course; package required | `bun:sqlite`                        |
| Build/distribution    | `npm pack --dry-run`                 | `deno compile`                   | `Bun.build` and `--compile`         |
| Node API relationship | reference implementation             | compatibility layer; verify APIs | compatibility layer; verify APIs    |

Compatibility changes over time. Test the exact APIs and versions a project
claims rather than treating the table as a permanent guarantee.

## 🧬 TypeScript pipelines

### 🟩 Node.js

Node can strip erasable TypeScript syntax, but it does not type-check and does
not use `tsconfig.json` to transform unsupported syntax.

```bash
node file.ts
npm run lesson -- file.ts
npm run typecheck:node
```

Use native execution for focused compatible examples, `tsx` for the full course
syntax, and `tsc` as the authoritative static check.

### 🦕 Deno

Deno executes TypeScript and owns its check pipeline:

```bash
deno run file.ts
deno check file.ts
```

`deno.json` scopes compiler options, tasks, imports, formatting, and linting.

### 🥟 Bun

Bun transpiles TypeScript quickly but does not prove type correctness:

```bash
bun run file.ts
npm run typecheck:bun
```

Keep `@types/bun` pinned and use the Bun-specific TypeScript configuration so
Bun globals do not leak into Node or Deno source.

## 📦 Packages, configuration, and lockfiles

- Node/npm uses `package.json`, npm scripts, and `package-lock.json`.
- Deno can use JSR, npm packages, `package.json`, and mappings in `deno.json`.
- Bun uses `package.json`, an npm-compatible registry workflow, and `bun.lock`.
- Commit every lockfile used by CI.
- Do not hand-edit generated lockfiles.
- Review package lifecycle scripts. Bun's trust model intentionally blocks
  arbitrary dependency scripts until they are trusted.

Package compatibility is not runtime API compatibility. A package can install
successfully and still import an unsupported native module.

## 🔐 Permissions and authority

### 🟩 Node.js permission model

Node has process authority by default. `--permission` switches on restrictions,
then allowlists selected files, network access, child processes, workers,
addons, or other capabilities.

Treat it as a seat belt for trusted code, not a sandbox for malicious code.
Code can inherit authority through resources you explicitly grant.

### 🦕 Deno permissions

Deno denies sensitive I/O by default. Scope permissions by resource:

```bash
deno run --allow-read=.task-data --allow-write=.task-data \
  project/task-deno/main.ts --file .task-data/tasks.json list
deno run --allow-net=127.0.0.1:8080 \
  project/task-deno/main.ts --backend rest --url http://127.0.0.1:8080 list
```

Use `Deno.permissions.query`, `request`, and `revoke` when a program needs to
reason about authority. Tests can declare permissions per test.

File adapters that create a state file also create its parent or a temporary
sibling. Grant the dedicated state directory rather than only the final file.
The event-relay Deno adapter uses the same rule:

```bash
deno run \
  --allow-read=.relay-data,capstones/idiomatic/tests/fixtures/events-valid.jsonl \
  --allow-write=.relay-data \
  capstones/idiomatic/solution/deno/main.ts \
  ingest --log .relay-data/events.jsonl \
  --input capstones/idiomatic/tests/fixtures/events-valid.jsonl

deno run --allow-read=.relay-data --allow-write=.relay-data \
  --allow-net=127.0.0.1:8080 \
  capstones/idiomatic/solution/deno/main.ts \
  serve --log .relay-data/events.jsonl
```

The relay needs no environment, subprocess, FFI, or system permission. Its
server additionally needs only the selected loopback listener.

### 🥟 Bun authority

Bun processes inherit normal operating-system authority. Put security
boundaries in the operating system, container, service account, filesystem
permissions, and deployment configuration. Dependency lifecycle trust is a
separate package-install boundary.

## 📁 Files, processes, and streams

| Operation         | Node.js                    | Deno                 | Bun                       |
| ----------------- | -------------------------- | -------------------- | ------------------------- |
| Read text         | `node:fs/promises`         | `Deno.readTextFile`  | `Bun.file(...).text()`    |
| Write text        | `node:fs/promises`         | `Deno.writeTextFile` | `Bun.write`               |
| Rename atomically | `rename` on one filesystem | `Deno.rename`        | Node-compatible `rename`  |
| Run process       | `node:child_process`       | `Deno.Command`       | `Bun.spawn`               |
| Stream model      | Node and Web streams       | Web streams          | Web streams and Bun sinks |

An atomic temporary-file rename prevents partial documents but does not alone
coordinate competing processes. The Node capstone also uses `proper-lockfile`.
The Deno and Bun adapters add in-process serialization but intentionally provide
no cross-process lock. On Unix-like systems, both adapters create private task
files and preserve existing restrictive modes.

## 🧪 Tests and coverage

- Use `node:test` for Node-specific behavior, mocks, subprocesses, and coverage.
- Use `Deno.test` for steps, sanitizers, permissions, and Deno resources.
- Use `bun:test` for Bun globals, Jest-style assertions, mocks, concurrency,
  retries, and Bun coverage.
- Use a framework-neutral conformance script for behavior claimed across all
  runtimes.

Do not make all tests portable. Native permission, shutdown, file, and database
behavior needs native tests.

## 🌐 HTTP servers

The three retained Task project servers share resource shapes and status
semantics:

- `GET /tasks` lists tasks.
- `POST /tasks` requires JSON and returns `201`.
- `PATCH /tasks/:id/complete` returns the completed task.
- `DELETE /tasks/:id` returns `204`.
- invalid input returns `400`; missing resources return `404`.
- unexpected errors are logged locally and return a generic `500`.

The adapters remain native:

- Node uses streams from `IncomingMessage` and writes through `ServerResponse`.
- Deno receives Web `Request` and returns `Response` through `Deno.serve`.
- Bun receives Web `Request` and returns `Response` through `Bun.serve`.

Test request limits, content type, aborts, local binding, and shutdown in each
runtime rather than hiding them behind an oversized abstraction.

## 🗄️ Database boundaries

`TaskStorage` keeps the domain independent from a database:

- Node uses `node:sqlite`.
- Bun can use `bun:sqlite`.
- Deno has no SQLite adapter in this course; a package adapter would be required.

Parameter binding, transactions, row validation, close behavior, and native
binary deployment remain adapter responsibilities.

`TaskClient` and
[`RestTaskStorage`](../project/task-client/rest-storage.ts) form the portable
Web-fetch REST boundary shared by all three runtime CLIs.

The idiomatic event relay has a different contract: `GET /healthz`,
`POST /v1/events`, and filtered `GET /v1/events`. Its
[normative specification](../capstones/idiomatic/SPEC.md) defines the exact
request limits, statuses, and lifecycle behavior.

## 📦 Builds and executables

### 🟩 Node.js

Use `npm pack --dry-run` to inspect package contents before publishing. Node's
single-executable workflow has different constraints from simply running
TypeScript and should be evaluated for the target deployment.

### 🦕 Deno

`deno compile` creates a standalone executable and can embed permissions.
Compile smoke tests should write to ignored directories and remove output.

### 🥟 Bun

`Bun.build` bundles for Bun, browser, or Node targets. `bun build --compile`
creates a standalone executable. Native modules and target platform still
affect portability.

## 🔁 Migration checklist

1. Inventory imports, globals, package scripts, environment access, files,
   subprocesses, tests, servers, databases, native addons, and build commands.
2. Separate language/Web-standard code from runtime authority.
3. Extract small file, command, server, and database interfaces.
4. Keep the Task domain and behavioral contract unchanged.
5. Replace one adapter and one test layer at a time.
6. Add the target runtime's configuration and lockfile.
7. Apply the target permission and lifecycle model explicitly.
8. Run native format, lint, type, test, coverage, build, and compile checks.
9. Run cross-runtime conformance.
10. Update operational documentation before claiming support.

For this repository's retained Task project, use the
[old-to-new migration guide](PROJECT_MIGRATION.md). It distinguishes reusable
adapter patterns from incompatible Task, key/value, and event data models.

## 🧭 Runtime selection

Choose from requirements, not identity:

- **Node.js:** strongest choice for full Node compatibility, ecosystem breadth,
  LTS cadence, and mature production integrations.
- **Deno:** strong choice for default-deny permissions, Web APIs, JSR, and an
  integrated formatter/linter/checker/tester/compiler.
- **Bun:** strong choice for an integrated npm-compatible package manager,
  runtime, test runner, SQLite API, bundler, and executable compiler.

Confirm hosting support, observability, native dependencies, cold-start needs,
team experience, upgrade policy, and real workload performance.

## ✅ Executable evidence

The course backs its support claims with:

```bash
npm run check:deno
npm run check:bun
npm run portability
npm run coverage
npm run audit:node
deno run scripts/runtime-conformance.ts
bun run scripts/runtime-conformance.ts
```

CI runs each runtime's configured lessons, exercises, Task adapters, capstones,
formatting, linting, type checking, tests, audits, and relevant build or compile
smoke checks. Node 26 runs the aggregate coverage gate; Node 24 also runs the
full Node test matrix. Deno and Bun run their native checks in separate jobs.

## 🏆 Capstone boundaries

- The
  [comparative versioned configuration store](../capstones/comparative/README.md)
  is intentionally Node-only. It measures the
  [frozen cross-language contract](../capstones/comparative/spec/SPEC.md), not
  runtime portability.
- The [idiomatic event relay](../capstones/idiomatic/README.md) is the complete
  capability-based portability example. Its
  [specification](../capstones/idiomatic/SPEC.md) keeps the core on standard
  TypeScript, promises, async iterables, `AbortSignal`, `TextEncoder`, and
  `TextDecoder`; Node.js, Deno, and Bun adapters inject file, process, stdin,
  and loopback HTTP authority.
- The [connected Task project](../project/README.md) is retained teaching and
  migration material, not a third capstone.

`npm run portability` first runs the same in-memory semantic smoke under the
current runtime, then invokes all three solution CLIs as subprocesses against one
fixture and compares their ingest and replay streams byte-for-byte.
