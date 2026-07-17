# 🗃️ 11. SQL and SQLite

## 🎯 Learning goals

- model application data with tables, constraints, and query results;
- bind values instead of interpolating SQL strings;
- group related writes in transactions; and
- close SQLite handles deliberately after each operation or test.

## ▶️ Run the lesson

```bash
npm run lesson -- lessons/11_sql_and_sqlite/01_sqlite_transactions.ts
```

The lesson uses Node's built-in `node:sqlite` with an in-memory database. It
executes real SQL without leaving a database file behind.

## ⚠️ Common mistakes

- interpolating untrusted values into SQL;
- treating application validation as a replacement for database constraints;
- committing only part of a related change; and
- relying on process exit rather than closing a database handle.

## ❓ Review questions

1. Why are placeholders safer than string interpolation?
2. Which invariant belongs in a SQLite constraint as well as application code?
3. What does a transaction guarantee if its second write fails?
4. Why is an in-memory database useful for a deterministic test?

Continue with the [matching exercise](../../exercises/11_sql_and_sqlite/).
