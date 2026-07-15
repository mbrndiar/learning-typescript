# Exercise: Test a Retry Policy

The reference implementation retries only the failures approved by the supplied
predicate. Study the solution tests, then implement the same contract in
`exercise.ts`.

```bash
node --import=tsx --test exercises/08_testing/solution.test.ts
```

The committed test imports `solution.ts`. Temporarily point it at `exercise.ts`
while implementing your retry policy.
