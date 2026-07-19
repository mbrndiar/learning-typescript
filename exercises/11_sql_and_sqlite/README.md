# 🗃️ Exercise: SQLite Task Repository

Implement `openTaskRepository` with Node's built-in `node:sqlite`. Use an
in-memory database, a parameterized insert, a deterministic ordered query, and
an explicit `close` method.

```bash
EXERCISE_IMPLEMENTATION=exercise \
  node --import=tsx --test exercises/11_sql_and_sqlite/solution.test.ts
node --import=tsx --test exercises/11_sql_and_sqlite/solution.test.ts
```

The first command selects your starter; the second selects the reference solution.
