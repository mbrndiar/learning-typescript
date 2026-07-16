# 🗄️ Comparative capstone: Node.js versioned configuration store

This Node-only target implements the frozen [`comparative-kv` 1.0.0
contract](spec/SPEC.md). The normative fixtures are under
[`spec/fixtures/`](spec/fixtures/) and the runner rules are in
[`spec/SCENARIOS.md`](spec/SCENARIOS.md). The shared specification is copied
byte-for-byte across language repositories and must not be edited locally.

## 🧱 Layout

```text
comparative/
├── starter/              # guided, import-safe scaffold
├── solution/
│   ├── src/
│   │   ├── domain.ts     # restricted JSON, keys, expectations
│   │   ├── errors.ts     # exact categories, details, exit codes
│   │   ├── cli.ts        # frozen grammar and envelopes
│   │   └── store.ts      # node:sqlite schema, migration, CAS
│   └── node/main.ts      # subprocess launcher
└── tests/
    ├── node/m1-*.test.ts … m5-*.test.ts
    └── support/          # fixture runner, barrier actor, lock helper
```

The solution uses Node 24/26 built-ins, especially `node:sqlite`; it adds no
runtime dependency. SQLite connections use a 10-second busy timeout, WAL,
foreign keys, exact v0/v1 schema fingerprints, integrity validation,
`BEGIN IMMEDIATE` initialization/migration/mutations, and prompt close/cleanup.

The custom JSON parser validates complete RFC 8259 syntax before tree defects,
retains duplicate members until last-wins normalization, validates exact decimal
integrality and binary64 finiteness, rejects unpaired surrogates, and enforces
the 32-container and 65,536-byte limits.

## 🧪 Commands

```bash
npm run typecheck:capstones:node
CAPSTONE_IMPLEMENTATION=solution npm run test:capstone:comparative
npm run test:capstone:comparative:contention
npm run coverage:comparative
```

The five suites correspond directly to the shared milestones: domain/value
contracts, exact CLI, SQLite initialization/migration, complete revision/CAS
behavior, and real independent-process conformance. The fixture runner rejects
unknown fixture operations, captures raw process output, enforces compact
single-line envelopes, uses repository-local scenario directories, checks
SQLite integrity, and proves database/WAL sidecars are removable.

`CAPSTONE_IMPLEMENTATION` defaults to `starter`, so the normal starter smoke test
remains green while milestone suites are skipped. Set it to `solution` for the
completed reference. Learners should follow the staged notes in
[`starter/README.md`](starter/README.md) without changing the shared fixtures.
