# 🧠 Exercise: Validate an HTTP Task Body

Implement `parseCreateTask` for an untrusted decoded JSON value. Accept exactly
a non-empty `title` and reject malformed data with `TypeError`.

```bash
node --import=tsx --test exercises/11_http_and_application_integration/solution.test.ts
```

The committed test imports `solution.ts`. Temporarily point it at `exercise.ts`
to test your request validator.
