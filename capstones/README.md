# 🏆 TypeScript capstones

The course now has two capstone tracks:

- [`comparative/`](comparative/) implements the frozen cross-language SQLite
  key/value contract with Node.js.
- [`idiomatic/`](idiomatic/) builds a runtime-neutral event-relay core with thin
  Node.js, Deno, and Bun adapters.

Both tracks contain matching `starter/` and `solution/` module boundaries. The
current files are deliberately compileable scaffolds: they expose typed public
seams and a stable test layout, but they do not implement any milestone.

## 🎯 Selecting a target

Shared test loaders use `CAPSTONE_IMPLEMENTATION`:

```bash
CAPSTONE_IMPLEMENTATION=starter npm run test:capstone:comparative
CAPSTONE_IMPLEMENTATION=solution npm run test:capstone:idiomatic:node
```

The value must be `starter` or `solution`; omitting it selects `starter`.
Scaffold smoke tests explicitly import both targets and assert that unfinished
operations report `CAPSTONE_INCOMPLETE` (or `not_implemented` for the pure relay
parser) rather than accidentally behaving like a partial solution.

## ✅ Current harness checks

```bash
npm run typecheck:capstones:node
npm run test:capstones:node
deno task capstone:test
bun test capstones/idiomatic/tests/bun
```

The ordinary Node, Deno, and Bun repository checks also include the relevant
capstone trees. Milestone tests will be added to the existing runtime-specific
test directories without changing these commands.
