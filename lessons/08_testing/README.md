# 8. Testing

## Learning goals

- write synchronous and asynchronous tests with `node:test`;
- choose focused assertions from `node:assert/strict`;
- organize repeated cases as table-driven tests;
- isolate files and external services behind temporary resources or functions;
- verify failure behavior, not only happy paths; and
- interpret coverage as evidence, not a substitute for useful cases.

## Run the lessons

```bash
node --import=tsx --test lessons/08_testing/01_table_driven.test.ts
node --import=tsx --test lessons/08_testing/02_async_boundaries.test.ts
```

A deterministic test controls its inputs, does not depend on execution order,
and cleans up resources it creates. Prefer small seams—such as an injected
clock or request function—over broad module replacement.

## Common mistakes

- comparing objects with `equal` instead of `deepEqual`;
- forgetting to `await` a promise or subtest;
- testing private implementation details instead of behavior;
- sharing mutable state between tests; and
- chasing 100% coverage with low-value assertions.

## Review questions

1. What makes a test deterministic?
2. When is `assert.rejects` more appropriate than `assert.throws`?
3. Why should a test create its own temporary directory?
4. What behavior belongs in a table-driven case?
5. What can high coverage fail to prove?

Continue with the [matching exercise](../../exercises/08_testing/).
