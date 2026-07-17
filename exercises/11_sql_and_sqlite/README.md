# 🗃️ Exercise: SQLite Task Repository

Implement `openTaskRepository` with Node's built-in `node:sqlite`. Use an
in-memory database, a parameterized insert, a deterministic ordered query, and
an explicit `close` method.

```bash
node --import=tsx --test exercises/11_sql_and_sqlite/solution.test.ts
```

The committed test imports `solution.ts`. Temporarily point it at `exercise.ts`
to test your implementation.
