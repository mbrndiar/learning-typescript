# 🌐 15. Cross-Runtime Portability and Migration

## 🎯 Learning goals

- separate ECMAScript, TypeScript, Web APIs, and runtime-specific APIs;
- compare capabilities without reducing runtime choice to speed claims;
- keep the Task domain portable through explicit adapters;
- migrate files, commands, tests, servers, and databases deliberately; and
- prove each portability claim with executable conformance checks.

## ▶️ Run the lessons everywhere

```bash
# Node.js
npm run lesson -- lessons/15_runtime_portability/01_capability_matrix.ts
npm run lesson -- lessons/15_runtime_portability/02_shared_task_domain.ts
npm run lesson -- lessons/15_runtime_portability/03_migration_adapters.ts
npm run lesson -- lessons/15_runtime_portability/04_runtime_selection.ts

# Deno
deno run lessons/15_runtime_portability/01_capability_matrix.ts
deno run lessons/15_runtime_portability/02_shared_task_domain.ts
deno run lessons/15_runtime_portability/03_migration_adapters.ts
deno run lessons/15_runtime_portability/04_runtime_selection.ts

# Bun
bun run lessons/15_runtime_portability/01_capability_matrix.ts
bun run lessons/15_runtime_portability/02_shared_task_domain.ts
bun run lessons/15_runtime_portability/03_migration_adapters.ts
bun run lessons/15_runtime_portability/04_runtime_selection.ts
```

Run the checked conformance scenario with:

```bash
npm run check:deno
npm run check:bun
npm run portability
deno run scripts/runtime-conformance.ts
bun run scripts/runtime-conformance.ts
```

## 🧭 Capability boundaries

| Concern             | Node.js                | Deno                      | Bun                    |
| ------------------- | ---------------------- | ------------------------- | ---------------------- |
| Permissions         | opt-in restrictions    | default-deny grants       | process authority      |
| Native tests        | `node:test`            | `Deno.test`               | `bun:test`             |
| Native HTTP         | `node:http`            | `Deno.serve`              | `Bun.serve`            |
| Native SQLite       | `node:sqlite`          | package required          | `bun:sqlite`           |
| Course distribution | `npm pack --dry-run`   | `deno compile`            | `bun build --compile`  |
| Package orientation | npm and `package.json` | JSR, npm, and `deno.json` | npm and `package.json` |

Compatibility is not the same as native behavior. A Deno program importing
`node:fs` is using Deno's Node compatibility layer; a Bun program importing
`node:http` is not demonstrating `Bun.serve`.

## 🧩 One domain, three adapters

The shared code in [`project/task-core/`](../../project/task-core/) owns Task
validation, storage semantics, manager coordination, document parsing, and CLI
execution. The portable REST adapter lives in
[`project/task-client/rest-storage.ts`](../../project/task-client/rest-storage.ts).
Runtime projects own authority:

```text
Task core
├── Node adapters: files, CLI, node:http, node:sqlite
├── Deno adapters: permissions, files, CLI, Deno.serve
└── Bun adapters: files, CLI, Bun.serve, bun:sqlite
```

The portable storage contract covers observable Task behavior. It does not
pretend that every file-locking, permission, or database guarantee is
identical.

## 🔁 Migration workflow

1. Inventory imports, globals, package scripts, environment access, subprocesses,
   files, tests, servers, databases, and build commands.
2. Classify each dependency as language, Web standard, Node compatibility, or
   runtime-native.
3. Move runtime authority behind small interfaces before changing runtimes.
4. Replace one adapter at a time and keep domain tests unchanged.
5. Add native tests for permission, shutdown, file, and database behavior.
6. Run the same conformance scenario on every runtime claimed in documentation.

## 🧭 Runtime selection

- Choose **Node.js** when broad Node compatibility, ecosystem depth, and LTS
  operations dominate.
- Choose **Deno** when default-deny permissions and an integrated toolchain are
  primary requirements.
- Choose **Bun** when an integrated package manager, test runner, bundler,
  server, and compiler fit the deployment environment.
- Measure the real application before choosing from benchmark headlines.
- Check hosting, observability, native dependency, and support constraints
  before committing to a production runtime.

## ✅ Portability checklist

1. Keep the domain model free of runtime imports.
2. Prefer ES modules and explicit extensions.
3. Prefer Web APIs when they meet the requirement.
4. Hide runtime APIs behind small interfaces.
5. Test each claimed runtime in CI.
6. Document intentionally non-portable adapters.
7. State low-level guarantees such as locking and permission scope precisely.
8. Keep generated binaries, bundles, databases, and coverage out of Git.

## ⚠️ Common mistakes

- treating TypeScript support as identical type-checking behavior;
- assuming npm compatibility means complete Node API compatibility;
- running Deno with broad `-A` permissions without understanding them;
- using a runtime-specific global deep inside domain code;
- treating compatibility APIs as evidence of native runtime knowledge;
- selecting a runtime from a synthetic benchmark alone; and
- claiming the full capstone is portable after testing only one small script.

## ❓ Review questions

1. Which features belong to JavaScript rather than a runtime?
2. Why is `fetch` often more portable than a runtime-specific HTTP client?
3. Which permissions differ between Node.js and Deno?
4. Why are file locking and SQLite guarantees adapter concerns?
5. What should a migration inventory contain?
6. What executable evidence supports this course's portability claim?

Continue with the
[matching exercise](../../exercises/15_runtime_portability/).
