# 🧭 Exercise: Select Compatible Runtimes

Implement `findCompatibleRuntimes`. Return every runtime that satisfies every
requested capability, preserving the profile input order. Omitted requirements
do not filter results.

```bash
node --import=tsx --test exercises/15_runtime_portability/solution.test.ts
deno test exercises/15_runtime_portability/portable.test.ts
bun test exercises/15_runtime_portability/portable.test.ts
```

The Node test imports `solution.ts`. Temporarily point it at `exercise.ts` while
working. The portable test proves the same solution under Deno and Bun.
