# 🏆 TypeScript capstones

Before selecting a final capstone, complete the compact
[Task REST API applied project](../projects/tasks/README.md). It is the
course's required bridge from the runtime modules to the larger targets.

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
Every M1–M5 suite exercises that selected target. M0 imports both targets and
checks metadata, module paths, and public-boundary parity without requiring an
implementation to remain unfinished. An incomplete selected starter therefore
fails its milestone red while M0 stays green; CI selects `solution`.

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
