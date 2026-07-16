# 🟦 learning-typescript

A complete, hands-on introduction to JavaScript, TypeScript, and server-side
runtime programming for independent learners. The course begins with a short
JavaScript foundation, then uses strict TypeScript with Node.js as the primary
runtime. A four-module runtime track then explores Node.js, Deno, Bun, and
cross-runtime migration in depth.

## 🎯 What you will learn

By the end of the course, you will be able to:

- read, write, run, debug, and test modern JavaScript and TypeScript;
- explain the difference between the language, the type checker, and a runtime;
- model data with strict types, unions, generics, classes, and composition;
- validate untrusted values at command-line, file, JSON, and HTTP boundaries;
- use npm, ES modules, files, processes, structured logs, and SQLite;
- write deterministic tests with `node:test`, `Deno.test`, and `bun:test`;
- reason about promises, the event loop, cancellation, streams, and workers;
- build HTTP/JSON clients and servers with graceful shutdown;
- use native permissions, file, process, HTTP, database, build, and compile APIs;
- migrate one shared Task domain through Node.js, Deno, and Bun adapters; and
- prove portability through executable conformance checks.

## ✅ Initial requirements

- Node.js 24 LTS or Node.js 26 Current
- npm (included with Node.js)

Node.js is the only runtime required initially. Git is needed only if you clone
the repository instead of downloading it. Install Deno 2.9.3 for module 13 and
Bun 1.3.14 for module 14; modules 1-12 use Node.js alone.

See [`docs/SETUP.md`](docs/SETUP.md) for installation, editor setup, and
troubleshooting. If programming syntax is entirely new, begin with
[`docs/BEGINNER_GUIDE.md`](docs/BEGINNER_GUIDE.md).

## ▶️ Active study loop

Install the pinned development tools:

```bash
npm install
```

Run a JavaScript lesson directly with Node:

```bash
node lessons/01_javascript_programs_and_values/01_programs_and_primitives.js
```

Run a TypeScript lesson through `tsx`:

```bash
npm run lesson -- lessons/04_typescript_foundations/01_migrating_javascript.ts
```

For every module:

1. Read its README and predict each example's output or failure.
2. Run the examples, then change one small value and explain the difference.
3. Answer the review questions without looking back.
4. Complete the matching exercise before reading its solution.
5. Run the smallest relevant test and then the wider feedback loop.

## 🔁 Developer feedback loop

```bash
npm run format:check
npm run lint
npm run typecheck:node
npm run course:node
npm run test:node
npm run coverage
npm run links
npm run audit:node

# After installing Deno and Bun for modules 13-15
npm run check:deno
npm run check:bun
npm run portability
```

## 📐 Conventions

- Modules 1-3 use JavaScript; modules 4-15 use TypeScript by default.
- ES modules (`import` and `export`) are the default. CommonJS is covered only
  for interoperability.
- TypeScript is always checked in strict mode. Avoid `any` and unsafe type
  assertions; narrow `unknown` values at boundaries.
- Runtime validation and static typing solve different problems. JSON, command
  arguments, environment variables, and HTTP bodies remain untrusted.
- Examples prefer platform APIs and small explicit functions over frameworks.
- `...` means omitted code unless the surrounding explanation says otherwise.

## 🧠 Practice exercises

Every module has a matching folder under [`exercises/`](exercises/README.md).
Starter files contain TODOs and behavioral tests; `solution.ts` or
`solution.js` contains one reference implementation.

## 🏆 Capstones

The course has two completed reference capstones with matching guided starters:

- The Node-only [`comparative-kv` capstone](capstones/comparative/README.md)
  implements the frozen cross-language
  [`comparative-kv` specification](capstones/comparative/spec/SPEC.md) with
  `node:sqlite`, restricted JSON normalization, global revisions, CAS,
  migration, and real subprocess contention.
- The idiomatic
  [cross-runtime event relay](capstones/idiomatic/README.md) implements its
  [TypeScript specification](capstones/idiomatic/SPEC.md) with a portable core
  and native Node.js, Deno, and Bun adapters.

See the [capstone index](capstones/README.md) for target selection, milestone
commands, coverage, and conformance checks.

## 🧭 Retained migration reference

The [`project/` Task Manager](project/README.md) is the earlier connected
application used by modules 12-15:

```text
Shared Task core
├── Node.js -> CLI -> JSON/REST -> node:http -> node:sqlite
├── Deno    -> CLI -> JSON/REST -> Deno.serve
└── Bun     -> CLI -> JSON/REST -> Bun.serve -> bun:sqlite
```

The domain, JSON document format, CLI execution, and storage contract remain
independent from runtime-specific adapters. The portable REST storage adapter is
[`project/task-client/rest-storage.ts`](project/task-client/rest-storage.ts).
Node file storage adds cross-process locking; Deno and Bun file storage provide
atomic replacement plus in-process serialization only.

It remains intentionally available as a comparison and migration source; it is
not a third capstone and its Task data is not compatible with either capstone's
storage format. Follow the durable
[old-to-new migration guide](docs/PROJECT_MIGRATION.md) before reusing or
retiring any part of `project/`.

## 🗺️ Course outline

1. [JavaScript Programs and Values](lessons/01_javascript_programs_and_values/)
2. [Control Flow and Functions](lessons/02_control_flow_and_functions/)
3. [Collections, Objects, and Modules](lessons/03_collections_objects_and_modules/)
4. [TypeScript Foundations](lessons/04_typescript_foundations/)
5. [Modeling Valid Data](lessons/05_modeling_valid_data/)
6. [Reusable Typed Code](lessons/06_reusable_typed_code/)
7. [Errors, Files, JSON, and Packages](lessons/07_errors_files_json_and_packages/)
8. [Testing](lessons/08_testing/)
9. [Tooling, Debugging, CLI, and Observability](lessons/09_tooling_debugging_cli_observability/)
10. [Asynchronous JavaScript and Concurrency](lessons/10_async_and_concurrency/)
11. [HTTP and Application Integration](lessons/11_http_and_application_integration/)
12. [Node.js Runtime Deep Dive](lessons/12_nodejs_runtime/)
13. [Deno Runtime Deep Dive](lessons/13_deno_runtime/)
14. [Bun Runtime Deep Dive](lessons/14_bun_runtime/)
15. [Cross-Runtime Portability and Migration](lessons/15_runtime_portability/)

## 🗒️ Cheat sheet and boundaries

[`CHEATSHEET.md`](CHEATSHEET.md) is a compact syntax, type-system, runtime, and
tooling reference. This course focuses on language and server-side foundations.
Browser DOM programming, React/Vue/Angular, bundlers, full-stack frameworks, and
cloud deployment are separate follow-on topics.

Use [`docs/RUNTIME_PORTABILITY.md`](docs/RUNTIME_PORTABILITY.md) for the full
runtime capability, migration, and selection guide.
