# Exercise: Bounded Async Mapping

Implement `mapWithLimit` while preserving input order and never running more
than `limit` transformations simultaneously.

```bash
node --import=tsx --test exercises/10_async_and_concurrency/solution.test.ts
```

The committed test imports `solution.ts`. Temporarily point it at `exercise.ts`
to test your bounded mapper.
