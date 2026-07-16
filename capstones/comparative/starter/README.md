# 🧭 Guided Node.js starter

Keep the exported boundary in [`src/index.ts`](src/index.ts) and the import-safe
launcher in [`node/main.ts`](node/main.ts). Replace the typed
`CapstoneIncompleteError` only as each milestone becomes runnable.

1. Model keys, expectations, revisions, and a duplicate-preserving restricted
   JSON parser. Validate syntax before the normalized surviving value tree.
2. Parse only the four frozen CLI forms and emit exactly one compact JSON line.
3. Add a `node:sqlite` store with exact v0/v1 recognition and atomic migration.
4. Reserve every mutation with `BEGIN IMMEDIATE`; implement global revisions,
   CAS, binary ordering, and failure rollback.
5. Run the independent-process fixture suite, including barriers, busy waits,
   races, integrity checks, and sidecar cleanup.

Run a selected starter milestone as a red/green exercise by temporarily removing
its skip in `tests/node/mN-*.test.ts`. The completed reference remains under
`solution/`; do not copy it wholesale if the goal is deliberate practice.
