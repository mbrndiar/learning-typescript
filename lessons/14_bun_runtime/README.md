# 🥟 14. Bun Runtime

## 🎯 Learning goals

- use `bun install`, `bun add`, `bun run`, and `bunx` deliberately;
- explain `bun.lock`, lifecycle-script trust, `bunfig.toml`, and Bun's TypeScript transpilation;
- combine `Bun.file`, `Bun.write`, `Blob`, Web streams, and `Bun.spawn`;
- test with `bun:test` and persist data with `bun:sqlite`;
- serve, stream, bundle, and compile programs with Bun-native APIs; and
- identify when an example uses a Web API, a Bun-native API, or Bun's Node compatibility layer.

## ▶️ Exact commands

Run each deterministic lesson from the repository root:

```bash
bun run lessons/14_bun_runtime/01_packages_and_typescript.ts
bun run lessons/14_bun_runtime/02_files_streams_and_processes.ts
bun test lessons/14_bun_runtime/03_testing_and_sqlite.test.ts
bun run lessons/14_bun_runtime/04_servers_builds_and_executables.ts
```

Run the matching exercise and Bun capstone tests:

```bash
bun test exercises/14_bun_runtime/solution.test.ts
bun test capstones/idiomatic/tests/bun
```

Run the course collector and type checker:

```bash
npm run course:bun
npm run typecheck:bun
npm run build:bun
npm run check:bun
```

`npm run check:bun` also runs `bun audit`; the audit may contact the package
advisory service.

## 📦 Packages, lockfiles, and scripts

`bun install` resolves the project and updates the text-based `bun.lock`.
`bun install --frozen-lockfile` is the reproducible automation command.
`bun add package` changes dependencies, while `bun add --dev package` changes
development dependencies. `bun run name` runs a package script or source file;
`bunx tool` downloads or selects a package binary and executes it.

Bun does not run arbitrary dependency lifecycle scripts by default. Review a
package before adding it to `trustedDependencies`; trust is a security decision,
not a workaround for a noisy install. Root-package lifecycle scripts are a
separate concern and should also be reviewable.

`bunfig.toml` configures Bun behavior such as install registries, test settings,
preloads, and runtime defaults. It complements rather than replaces
`package.json`. Keep credentials out of committed configuration.

Bun transpiles TypeScript while running it, but transpilation is not static type
checking. Run the pinned compiler through `npm run typecheck:bun` separately.

## 🧭 API boundary map

| Capability                                | Preferred boundary in this module                |
| ----------------------------------------- | ------------------------------------------------ |
| Files and writes                          | Bun-native `Bun.file` and `Bun.write`            |
| Requests, responses, blobs, streams       | Web APIs                                         |
| Processes, serving, builds                | Bun-native `Bun.spawn`, `Bun.serve`, `Bun.build` |
| Tests and SQLite                          | Bun-native `bun:test` and `bun:sqlite`           |
| Rename, directory creation in the project | `node:fs/promises` compatibility                 |
| Path manipulation in the project          | `node:path` compatibility                        |

Bun's Node compatibility is useful, but importing `node:*` is not the same as
using a Bun-native API. Make that boundary visible so portability claims remain
accurate.

## 🧪 Tests, concurrency, retries, and coverage

`bun:test` provides hooks, mocks, table tests, concurrent and serial tests, and
per-test retry/timeout options. Concurrency is opt-in with `test.concurrent`;
shared mutable fixtures should remain serial. Retries can reduce noise from a
genuinely transient boundary, but must not hide deterministic defects.

```bash
bun test lessons/14_bun_runtime/03_testing_and_sqlite.test.ts
bun test --coverage capstones/idiomatic/tests/bun
```

Coverage reports executed lines and functions; it does not prove useful
assertions or complete behavior.

## 🌐 Servers, bundles, and executables

`Bun.serve` starts immediately and returns a server with `url` and `stop()`.
Static route tables are concise, while `fetch` handles unmatched or dynamic
requests. A `ReadableStream` can become a streaming response without Node
streams. Always stop test servers in `finally` or cleanup hooks.

`Bun.build` is the programmatic bundler and returns in-memory build artifacts
when no output directory is supplied. `bun build entry.ts --compile --outfile
app` creates a standalone executable for the current platform. A compiled
artifact is platform-specific unless a compile target is selected explicitly.

## ⚠️ Common mistakes

- assuming `bun run file.ts` performed a type check;
- deleting `bun.lock` instead of reviewing a dependency resolution change;
- broadly trusting lifecycle scripts without auditing the package;
- calling Node-compatible APIs “Bun-native”;
- forgetting to consume piped process output or await `subprocess.exited`;
- using concurrent tests that mutate the same database or mock;
- retrying deterministic failures;
- exposing exception messages in HTTP 500 responses; and
- starting a server at import time, which makes tests and reuse unsafe.

## ❓ Review questions

1. Why are transpilation and type checking separate operations?
2. What security decision does `trustedDependencies` represent?
3. Which APIs in the boundary map are portable Web APIs?
4. How do `timeout` and `signal` differ in `Bun.spawn`?
5. When should a `bun:test` case be serial rather than concurrent?
6. Why should a SQLite adapter remain behind a storage capability?
7. What cleanup is required after `Bun.serve` and spawned processes?
8. What does `--compile` produce that an in-memory `Bun.build` does not?

## 🔗 Continue building

- Complete the [matching Bun exercise](../../exercises/14_bun_runtime/).
- Study the [idiomatic Bun adapter](../../capstones/idiomatic/solution/bun/).
- Revisit the [runtime-neutral relay core](../../capstones/idiomatic/solution/core/).
- Run the [Bun contract tests](../../capstones/idiomatic/tests/bun/).
- Review the [runtime portability lesson](../15_runtime_portability/).
