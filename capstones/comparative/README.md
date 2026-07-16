# 🗄️ Comparative capstone: Node.js versioned configuration store

The normative contract is [`spec/SPEC.md`](spec/SPEC.md), with executable data
under [`spec/fixtures/`](spec/fixtures/) and runner rules in
[`spec/SCENARIOS.md`](spec/SCENARIOS.md). Do not edit the copied specification
without following its version and manifest process.

## 🧱 Scaffold layout

```text
comparative/
├── starter/
│   ├── src/index.ts
│   └── node/main.ts
├── solution/
│   ├── src/index.ts
│   └── node/main.ts
└── tests/
    ├── contracts/
    ├── node/
    └── support/
```

`starter` and `solution` export the same `src/index.ts` and `node/main.ts`
boundaries. The current `ComparativeApplication.run()` and `main()` functions
reject with `CapstoneIncompleteError`; they do not parse the KV CLI or open
SQLite yet. The Node entry points are import-safe and are the stable subprocess
launcher paths for later conformance tests.

## 🎯 Target selection and tests

The shared loader reads `CAPSTONE_IMPLEMENTATION`, defaulting to `starter`.
Current smoke tests import both targets regardless of the selection so boundary
drift is caught immediately.

```bash
npm run typecheck:capstones:node
npm run test:capstone:comparative
CAPSTONE_IMPLEMENTATION=solution npm run test:capstone:comparative
```

Keep framework-neutral contracts in `tests/contracts/` and Node wrappers in
`tests/node/`. Future milestone files belong at stable names such as
`tests/node/m1-domain.test.ts` through `tests/node/m5-conformance.test.ts`; the
package command discovers new `*.test.ts` files automatically.

When implementation work begins, preserve the public scaffold boundary and add
behavior behind it milestone by milestone. Do not weaken the frozen fixtures to
fit an implementation.
