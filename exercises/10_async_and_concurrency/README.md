# 🧠 Exercise: Bounded Async Mapping

Implement `mapWithLimit` while preserving input order and never running more
than `limit` transformations simultaneously. After the first rejected
transformation, stop claiming new values and wait for already-started transforms
to settle before rejecting with that first failure.

Also implement `measureDuration`. Use an injected monotonic `now()` capability,
default it to `performance.now()`, return the operation result with elapsed
milliseconds, preserve operation failures, and reject a clock that is non-finite
or moves backwards.

```bash
EXERCISE_IMPLEMENTATION=exercise \
  node --import=tsx --test exercises/10_async_and_concurrency/solution.test.ts
node --import=tsx --test exercises/10_async_and_concurrency/solution.test.ts
```

The first command selects your starter; the second selects the reference solution.
