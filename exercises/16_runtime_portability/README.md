# 🧭 Exercise: Select Compatible Runtimes

Implement `findCompatibleRuntimes`. Return every runtime that satisfies every
requested capability, preserving the profile input order. Omitted requirements
do not filter results.

```bash
node --import=tsx --test exercises/16_runtime_portability/solution.test.ts
node --import=tsx exercises/16_runtime_portability/portable-check.ts
deno run exercises/16_runtime_portability/portable-check.ts
bun run exercises/16_runtime_portability/portable-check.ts
```

The Node test imports `solution.ts`. Temporarily point it at `exercise.ts` while
working. The framework-free portable check proves the same solution under
Node.js, Deno, and Bun without reporting an empty test suite.
