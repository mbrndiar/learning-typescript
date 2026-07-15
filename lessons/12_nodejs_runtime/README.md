# 🟢 12. Node.js Runtime Deep Dive

## 🎯 Learning goals

- distinguish ESM package resolution from TypeScript type resolution;
- write erasable TypeScript that Node can execute without a transformer;
- choose deliberately between native Node execution, `tsx`, and `tsc`;
- understand the permission model, process lifecycle, subprocess cancellation, and
  timeouts;
- process bytes with buffers and streams while preserving backpressure;
- use `EventEmitter` and `worker_threads` without leaking resources;
- apply advanced `node:test`, diagnostics channels, and performance measurements;
  and
- inspect the files that `npm pack` would place at a distribution boundary.

## ▶️ Run the lessons

Run these commands from `learning-typescript`:

```bash
node lessons/12_nodejs_runtime/01_modules_and_native_typescript.ts
npm run lesson -- lessons/12_nodejs_runtime/02_permissions_processes_and_subprocesses.ts
npm run lesson -- lessons/12_nodejs_runtime/03_buffers_streams_events_and_workers.ts
node --import=tsx --test lessons/12_nodejs_runtime/04_testing_diagnostics_and_distribution.ts
npm run typecheck:node
```

The first command intentionally uses Node's native TypeScript support. The second
and third use `tsx`, which transforms a wider range of TypeScript syntax. The
fourth uses Node's test runner explicitly. `tsc` checks the whole Node course but
does not execute it because this repository enables `noEmit`.

## 🧭 Modules and native TypeScript

Node resolves runtime imports. TypeScript additionally resolves declarations for
type checking. In ESM, use explicit relative file extensions and `node:` prefixes
for built-ins. `import type` makes a dependency type-only and guarantees that it
is erased.

Node's native TypeScript mode removes erasable syntax such as annotations,
interfaces, type aliases, and `satisfies`. Syntax that needs JavaScript generation,
including enums and parameter properties, requires a transformer or Node's
transform-types option. `tsx` is convenient for development; `tsc` remains the
type checker and can also emit JavaScript in projects configured to do so.

## 🛡️ Permissions, processes, and cancellation

The permission model can deny selected APIs before application code uses them.
It is defense in depth, **not a sandbox**: allowed code may still consume CPU or
memory, exploit bugs, or use capabilities that were granted too broadly. Start
with no permissions and grant only the paths and operations a program needs.

Process cleanup belongs in `finally` blocks and signal handlers. The `exit` event
cannot wait for asynchronous work. Pass an `AbortSignal` to subprocess APIs,
observe both `error` and `close`, and always give external work a deadline.
The lesson's permission probe only attempts to read its own source and is safe to
run without enabling permissions for the parent process.

## 🌊 Bytes, streams, events, and workers

A JavaScript string counts Unicode code points differently from a `Buffer`, which
counts encoded bytes. Streams avoid retaining an entire data set in memory.
`pipeline` forwards errors, closes the chain, and pauses producers when a writable
stream applies backpressure.

`EventEmitter` listeners run synchronously in registration order, and an
unhandled `error` event terminates the process. Workers are useful for CPU-bound
JavaScript, not ordinary asynchronous I/O. Observe worker errors and exits so
threads cannot silently leak or leave the process hanging.

## 🩺 Tests, diagnostics, and distribution

`node:test` supports suites, subtests, mocks, diagnostics, hooks, concurrency, and
cancellation. Keep tests deterministic by controlling inputs rather than sleeping
or depending on the network.

`diagnostics_channel` provides low-overhead, opt-in instrumentation; it is not a
logging destination. Performance marks use a monotonic clock and should be
cleared in long-running processes. Diagnose from symptoms to measurements before
changing code.

The consumer sees the packed package, not the working tree. `npm pack --dry-run`
shows the actual distribution file list without creating a tarball. Check that
runtime files, declarations, source maps, exports, and package metadata agree.

## ⚠️ Common mistakes

- assuming a successful type check proves that Node can resolve an import;
- using enums or parameter properties in native strip-only TypeScript;
- treating the permission model as isolation from hostile code;
- calling `process.exit()` before buffered output or cleanup completes;
- ignoring the subprocess `error` event after aborting it;
- concatenating every chunk instead of processing a stream incrementally;
- emitting `error` without a listener or forgetting worker exit handling;
- benchmarking with wall-clock timestamps or one noisy sample; and
- publishing the repository contents without inspecting `npm pack --dry-run`.

## ❓ Review questions

1. Which TypeScript constructs can Node erase without generating JavaScript?
2. Why can TypeScript resolve an import that still fails at runtime?
3. Why are permissions useful even though they are not a sandbox?
4. Which subprocess events must cancellation code observe?
5. How does `pipeline` preserve backpressure and propagate failure?
6. When is a worker preferable to an asynchronous function?
7. Why should a diagnostics channel have no required subscribers?
8. Which command reveals the package a registry consumer would receive?

## 🧪 Practice exercise

Apply these ideas in the
[matching streaming JSON Lines exercise](../../exercises/12_nodejs_runtime/).
