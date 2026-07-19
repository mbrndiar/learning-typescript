# 🧭 Exercise: Select Compatible Runtimes

Implement `findCompatibleRuntimes`. Return every runtime that satisfies every
requested capability, preserving the profile input order. Omitted requirements
do not filter results.

```bash
EXERCISE_IMPLEMENTATION=exercise \
  node --import=tsx --test exercises/16_runtime_portability/solution.test.ts
node --import=tsx --test exercises/16_runtime_portability/solution.test.ts
node --import=tsx exercises/16_runtime_portability/portable-check.ts
deno run exercises/16_runtime_portability/portable-check.ts
bun run exercises/16_runtime_portability/portable-check.ts
```

The first test command selects your starter; the second selects the reference
solution. The framework-free portable check proves the reference solution under
Node.js, Deno, and Bun without reporting an empty test suite.
