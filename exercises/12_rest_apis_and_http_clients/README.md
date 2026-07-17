# 🌐 Exercise: Loopback REST Task API

Implement a loopback-only `POST /tasks` server. Validate an untrusted decoded
JSON body, return a `201` JSON task response, and expose deterministic shutdown
for the test.

```bash
node --import=tsx --test exercises/12_rest_apis_and_http_clients/solution.test.ts
```

The committed test imports `solution.ts`. Temporarily point it at `exercise.ts`
to test your REST boundary.
