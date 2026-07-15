# 11. HTTP and Application Integration

## Learning goals

- build a small HTTP/JSON boundary without hiding it behind a framework;
- validate method, path, content type, body size, and decoded values;
- use `fetch`, timeouts, and `AbortSignal` in clients;
- close servers and databases deliberately;
- use parameterized SQL and transactions; and
- keep routing, domain logic, and persistence in separate layers.

## Run the lessons

```bash
npm run lesson -- lessons/11_http_and_application_integration/01_http_server_and_fetch.ts
npm run lesson -- lessons/11_http_and_application_integration/02_sqlite_transactions.ts
```

An HTTP boundary translates between bytes, JSON, status codes, and domain
values. TypeScript types inside the application do not validate a request body.

The SQLite lesson uses Node's built-in `node:sqlite`. Parameter binding keeps
data separate from SQL syntax, and a transaction keeps related writes atomic.

## Common mistakes

- trusting `request.json()` because the receiving variable has a type;
- returning status `200` for malformed input;
- interpolating values into SQL strings;
- leaving a server or database open after a test; and
- retrying non-idempotent requests without an explicit design.

## Review questions

1. Which request properties must be checked before domain logic runs?
2. Why is a timeout normally implemented with an abort signal?
3. What does a transaction guarantee?
4. Why do parameterized statements prevent SQL injection?
5. Where should graceful shutdown begin and end?

Continue with the
[matching exercise](../../exercises/11_http_and_application_integration/).
