# 🤝 Typed Task Client

`client.ts` owns HTTP request construction, timeouts, status handling, and
response validation. [`rest-storage.ts`](rest-storage.ts) exports
`RestTaskStorage`, which adapts `TaskClient` to the shared storage contract and
translates HTTP 404 responses into `TaskNotFoundError`.

It uses `fetch`, `URL`, `Request`, `Response`, and `AbortSignal`, so Node.js,
Deno, and Bun can share it without a compatibility import.
