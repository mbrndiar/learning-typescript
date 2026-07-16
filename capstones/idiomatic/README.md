# 📡 Idiomatic capstone: cross-runtime event relay

Read the normative learner contract in [`SPEC.md`](SPEC.md). The capstone keeps
event semantics and orchestration in a runtime-neutral core, then makes process,
file, and server authority explicit in Node.js, Deno, and Bun adapters.

## 🧱 Scaffold layout

```text
idiomatic/
├── starter/
│   ├── core/
│   ├── node/
│   ├── deno/
│   └── bun/
├── solution/
│   ├── core/
│   ├── node/
│   ├── deno/
│   └── bun/
└── tests/
    ├── contracts/
    ├── node/
    ├── deno/
    └── bun/
```

The two cores export identical event unions, result/error types, `EventLog`,
`Subscriber`, `ReplayQuery`, and `parseEvent` boundaries. Each matching runtime
adapter exports `RUNTIME`, `createAdapter`, and `main`. The scaffold parser
returns a typed `not_implemented` result and adapter operations reject with
`CapstoneIncompleteError`; no relay, queue, log, CLI, or HTTP behavior exists
yet.

## 🎯 Shared contracts and target selection

Framework-neutral contracts live in `tests/contracts/`. Native wrappers load the
selected target through a small runtime-local loader and then run the same
contract:

```bash
CAPSTONE_IMPLEMENTATION=solution npm run test:capstone:idiomatic:node
CAPSTONE_IMPLEMENTATION=solution deno task capstone:test
CAPSTONE_IMPLEMENTATION=solution bun test capstones/idiomatic/tests/bun
```

Omitting the variable selects `starter`. The current `m0-scaffold` tests import
both targets explicitly, verify public-boundary symmetry, and assert intentional
incompleteness. This keeps all repository checks green without pretending that
a milestone is implemented.

Future contracts stay in `tests/contracts/`; wrappers use stable names and
locations such as `tests/node/m1-domain.test.ts`,
`tests/deno/m1-domain.test.ts`, and `tests/bun/m1-domain.test.ts`, continuing
through `m5-conformance`. Existing package/runtime commands discover the added
tests without being renamed.

## ✅ Focused checks

```bash
npm run typecheck:capstones:node
npm run test:capstone:idiomatic:node
deno task capstone:test
npm run test:capstone:idiomatic:bun
```
