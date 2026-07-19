# 🚨 7. Errors, Files, JSON, and Packages

## 🎯 Learning goals

- treat caught errors and decoded JSON as `unknown`;
- validate untrusted values before assigning domain types;
- use `node:fs/promises`, `URL`, and `node:path` safely;
- clean up resources with `try`/`finally`; and
- distinguish built-in modules, local modules, and npm packages;
- normalize validated RFC 3339 timestamps and choose the correct clock.

## ▶️ Run the lessons

```bash
npm run lesson -- lessons/07_errors_files_json_and_packages/01_unknown_json_and_errors.ts
npm run lesson -- lessons/07_errors_files_json_and_packages/02_files_paths_and_cleanup.ts
npm run lesson -- lessons/07_errors_files_json_and_packages/03_dates_times_and_timestamps.ts
```

TypeScript checks code, not external data. `JSON.parse`, files, environment
variables, and package responses cross a runtime boundary and must be validated.
Prefer returning a useful domain error over allowing a distant property access
to fail.

Use `node:` specifiers for Node built-ins. They make the dependency source
explicit and are also understood by compatibility layers in Deno and Bun.

## 🕒 Instants, calendar time, and durations

A `Date` represents an instant as milliseconds from the Unix epoch; it does not
retain the input's named time zone. An offset such as `+02:00` says how local
calendar fields map to an instant, while an IANA zone such as `Europe/Prague`
also carries historical daylight-saving rules. Use a zone when future calendar
rules matter, not only a fixed offset.

At a JSON or HTTP boundary, validate both the RFC 3339 shape and calendar ranges
before parsing. Then normalize the instant to UTC:

```typescript
const milliseconds = Date.parse("2026-07-16T10:01:00+02:00");
const canonical = new Date(milliseconds).toISOString();
// "2026-07-16T08:01:00.000Z"
```

`Date.parse` alone is too permissive for a strict external contract. A valid
timestamp such as the one above can be serialized canonically, but malformed
dates, impossible days, and out-of-range offsets must be rejected first.

Wall-clock time can jump when the system clock is corrected. Use `Date` for
timestamps and a monotonic clock such as `performance.now()` to measure elapsed
durations. Format an instant for people with `Intl.DateTimeFormat` and an
explicit `timeZone`; do not rewrite the stored instant as if display fields were
the original timestamp.

## ⚠️ Common mistakes

- writing `const task = JSON.parse(text) as Task` without validation;
- catching an error and assuming it has a `.message` property;
- building paths by concatenating `/` or `\`;
- forgetting to close or remove resources in failure paths; and
- accepting an impossible calendar date because `Date.parse` returned a number;
- measuring a duration by subtracting wall-clock timestamps; and
- installing a package before checking whether the runtime already provides the
  required API.

## ❓ Review questions

1. Why does a TypeScript type disappear at runtime?
2. When should a caught value be narrowed with `instanceof Error`?
3. Why is a file URL often safer than a working-directory-relative path?
4. What does the `node:` prefix communicate?
5. Which cleanup belongs in a `finally` block?
6. What information is lost when an offset timestamp becomes a `Date`?
7. Why is a monotonic clock a better duration source than `Date.now()`?

Continue with the
[matching exercise](../../exercises/07_errors_files_json_and_packages/).
