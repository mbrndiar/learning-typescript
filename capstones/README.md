# 🏆 TypeScript capstones

The course has two capstone tracks:

- [`comparative/`](comparative/) implements the frozen cross-language SQLite
  key/value contract with Node.js.
- [`idiomatic/`](idiomatic/) builds a runtime-neutral event-relay core with thin
  Node.js, Deno, and Bun adapters.

Both tracks have completed reference solutions, guided starters, five milestone
groups, and normative specifications. The comparative track is intentionally
Node-only; the idiomatic track proves one portable core through native Node.js,
Deno, and Bun adapters.

## 🎯 Selecting a target

Shared test loaders use `CAPSTONE_IMPLEMENTATION`:

```bash
CAPSTONE_IMPLEMENTATION=starter npm run test:capstone:comparative
CAPSTONE_IMPLEMENTATION=solution npm run test:capstone:idiomatic:node
```

The value must be `starter` or `solution`; omitting it selects `starter`.
Boundary smoke tests explicitly import both idiomatic targets, assert the
starter's intentional `CAPSTONE_INCOMPLETE`/`not_implemented` behavior, and
verify that the solution accepts a complete event. CI sets
`CAPSTONE_IMPLEMENTATION=solution`.

## ✅ Validation matrix

```bash
npm run typecheck:capstones:node
CAPSTONE_IMPLEMENTATION=solution npm run test:capstones:node
CAPSTONE_IMPLEMENTATION=solution npm run test:capstone:idiomatic:deno
CAPSTONE_IMPLEMENTATION=solution npm run test:capstone:idiomatic:bun
npm run coverage:comparative
npm run coverage:idiomatic
npm run portability
```

The ordinary Node, Deno, and Bun repository checks also include the relevant
capstone trees. Five shared idiomatic milestone contracts are wrapped by every
runtime; the comparative milestone suites exercise the frozen Node/SQLite
contract.
