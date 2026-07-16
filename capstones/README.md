# 🏆 TypeScript capstones

The course now has two capstone tracks:

- [`comparative/`](comparative/) implements the frozen cross-language SQLite
  key/value contract with Node.js.
- [`idiomatic/`](idiomatic/) builds a runtime-neutral event-relay core with thin
  Node.js, Deno, and Bun adapters.

Both tracks contain matching `starter/` and `solution/` module boundaries. The
idiomatic solution is complete across Node.js, Deno, and Bun; its guided starter
keeps the same seams with scoped milestone TODO failures. The comparative track
retains its existing scaffold and implementation status.

## 🎯 Selecting a target

Shared test loaders use `CAPSTONE_IMPLEMENTATION`:

```bash
CAPSTONE_IMPLEMENTATION=starter npm run test:capstone:comparative
CAPSTONE_IMPLEMENTATION=solution npm run test:capstone:idiomatic:node
```

The value must be `starter` or `solution`; omitting it selects `starter`.
Boundary smoke tests explicitly import both idiomatic targets, assert the
starter's intentional `CAPSTONE_INCOMPLETE`/`not_implemented` behavior, and
verify that the solution accepts a complete event.

## ✅ Current harness checks

```bash
npm run typecheck:capstones:node
npm run test:capstones:node
deno task capstone:test
bun test capstones/idiomatic/tests/bun
npm run coverage:idiomatic
npm run portability
```

The ordinary Node, Deno, and Bun repository checks also include the relevant
capstone trees. Five shared milestone contracts are wrapped by every runtime.
