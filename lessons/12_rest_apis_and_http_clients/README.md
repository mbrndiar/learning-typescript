# 🌐 12. REST APIs and HTTP Clients

## 🎯 Learning goals

- build a small REST/JSON boundary without hiding it behind a framework;
- validate method, path, content type, body size, and decoded values;
- use `fetch`, timeouts, and `AbortSignal` in clients;
- close loopback servers deliberately; and
- keep routing, request validation, and client behavior explicit.

## ▶️ Run the lessons

```bash
npm run lesson -- lessons/12_rest_apis_and_http_clients/01_rest_api_and_http_client.ts
```

An HTTP boundary translates between bytes, JSON, status codes, and domain
values. TypeScript types inside the application do not validate a request body.
The client uses `fetch` against a loopback server, so the example needs neither
a framework nor a public network connection.

## ⚠️ Common mistakes

- trusting `request.json()` because the receiving variable has a type;
- returning status `200` for malformed input;
- leaving a server open after a test; and
- retrying non-idempotent requests without an explicit design.

## ❓ Review questions

1. Which request properties must be checked before domain logic runs?
2. Why is a timeout normally implemented with an abort signal?
3. Why should a client check an HTTP status before trusting a response body?
4. Where should graceful shutdown begin and end?

Continue with the
[matching exercise](../../exercises/12_rest_apis_and_http_clients/).
