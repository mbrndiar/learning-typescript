# 🦕 13. Deno Runtime

## 🎯 Learning goals

- configure Deno tasks, imports, formatting, linting, checking, docs, and audits;
- distinguish Deno-native APIs from JSR, npm, `package.json`, and Node compatibility;
- apply Deno's default-deny permission model with narrow allow and deny scopes;
- use native files, environment access, subprocesses, tests, and atomic replacement;
- test with steps, hooks, sanitizers, per-test permissions, and coverage; and
- build local HTTP adapters with `Deno.serve`, Web APIs, cancellation, and shutdown.

## ▶️ Exact least-privilege commands

Run these from the repository root. None requires `-A`.

```bash
deno run --config=deno.json \
  lessons/13_deno_runtime/01_configuration_and_toolchain.ts

DENO_COURSE_DIR=lessons/13_deno_runtime/.lesson-data \
deno run --config=deno.json \
  --allow-read=lessons/13_deno_runtime/.lesson-data \
  --allow-write=lessons/13_deno_runtime/.lesson-data \
  --allow-env=DENO_COURSE_DIR \
  --allow-run=deno \
  lessons/13_deno_runtime/02_permissions_and_native_apis.ts

deno test --config=deno.json \
  lessons/13_deno_runtime/03_deno_testing.test.ts

deno run --config=deno.json \
  --allow-net=127.0.0.1 \
  lessons/13_deno_runtime/04_serve_and_compile.ts
```

Run the complete Deno 2.9.3 track with `deno task check`, or use the equivalent
`npm run check:deno` package wrapper. Individual root tasks include
`fmt:check`, `lint`, `typecheck`, `test`, `course`, `docs`, `audit`, and
`compile`.

To demonstrate deny precedence, add `--deny-env=HOME`; a matching deny wins even when another flag
broadly allows environment access.

## ⚙️ Configuration, packages, and tools

`deno.json` combines import maps, tasks, formatter settings, and lint rules. Local imports should
use explicit extensions. `jsr:` is Deno's ESM-first package path; `npm:` and discovered
`package.json` metadata provide npm interoperability. `node:` imports are **Node compatibility
examples**, not Deno-native APIs.

Use `deno fmt --check`, `deno lint`, and `deno check` locally. `deno doc` renders module
documentation. `deno task audit` evaluates locked dependency advisories and may
contact a registry; it is a repository and CI gate, while the individual lesson
programs remain deterministic and offline.

## 🔐 Permissions and native boundaries

Deno denies file, environment, network, subprocess, FFI, and system access unless granted. Scope
permissions to paths, variables, hosts, or commands. Query current authority with
`Deno.permissions.query`; do not call `request` in unattended code because it can prompt
interactively.

The file lesson writes a same-directory temporary file and renames it over the destination. This
prevents readers from observing a partial document. It also uses `Deno.env` and `Deno.Command`, each
with a separately scoped permission.

## 🧪 Tests, sanitizers, and coverage

`Deno.test` supplies nested `t.step` tests and enables operation, resource, and exit sanitizers by
default. Native lifecycle hooks are easy to express with setup plus `try/finally`; JSR BDD helpers
are optional but intentionally omitted from this offline track. Per-test `permissions` can reduce
authority further.

```bash
deno test --coverage=.coverage lessons/13_deno_runtime/03_deno_testing.test.ts
deno coverage .coverage
```

Importing `node:test` is a **Node compatibility technique**, not the native style used by this
module.

## 🌐 Serving and compiling

`Deno.serve` accepts Web `Request` objects and returns Web `Response` objects. Route on the parsed
local pathname, bind loopback for local examples, and use an `AbortSignal` plus `server.finished`
for deterministic shutdown.

`deno compile` bundles the module graph and runtime. `--target` cross-compiles, and the first build
for a target may download its runtime. Compile permissions carefully because they define authority
requested by the produced executable. `node:http` remains a clearly labeled compatibility option
rather than the Deno-native recommendation.

## ⚠️ Common mistakes

- using `-A` when one path, variable, host, or executable is sufficient;
- assuming npm support makes every Node package or native add-on portable;
- confusing import-map aliases with packages published to JSR;
- leaving a test server, timer, stream, or subprocess open and fighting sanitizers;
- reading an unlimited request body into memory;
- writing directly to a state file and exposing partial JSON after interruption; and
- claiming cross-process locking when an adapter only serializes one process.

## ❓ Review questions

1. What belongs in `deno.json`, and what still belongs in `package.json`?
2. Why should a deny rule take precedence over an allow rule?
3. Which permissions do `Deno.readTextFile`, `Deno.env.get`, and `Deno.Command` need?
4. What do Deno's operation and resource sanitizers detect?
5. Why are Request and Response useful portability boundaries?
6. What changes when permissions are embedded by `deno compile`?

## 🧭 Project links

- Build the [matching permission-planning exercise](../../exercises/13_deno_runtime/).
- Study the [Deno task adapter](../../project/task-deno/).
- Compare the runtime-neutral [task core](../../project/task-core/).
- Reuse the portable [Web fetch client](../../project/task-client/).
