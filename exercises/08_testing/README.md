# 🧠 Exercise: Test a Retry Policy

The reference implementation retries only the failures approved by the supplied
predicate. Study the solution tests, then implement the same contract in
`exercise.ts`.

```bash
EXERCISE_IMPLEMENTATION=exercise \
  node --import=tsx --test exercises/08_testing/solution.test.ts
node --import=tsx --test exercises/08_testing/solution.test.ts
```

The first command selects your starter; the second selects the reference solution.
