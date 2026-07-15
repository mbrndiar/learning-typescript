# 12. Node.js, Deno, and Bun Portability

## Learning goals

- separate ECMAScript, TypeScript, Web APIs, and runtime-specific APIs;
- identify a runtime without coupling domain logic to it;
- compare package installation, scripts, permissions, and test commands;
- use explicit adapters for files, processes, tests, and databases; and
- prove portability with smoke tests instead of assuming compatibility.

## Run the portable lessons

```bash
# Node.js
npm run lesson -- lessons/12_runtime_portability/01_runtime_identity.ts
npm run lesson -- lessons/12_runtime_portability/02_portable_web_apis.ts

# Deno
deno run lessons/12_runtime_portability/01_runtime_identity.ts
deno run lessons/12_runtime_portability/02_portable_web_apis.ts

# Bun
bun run lessons/12_runtime_portability/01_runtime_identity.ts
bun run lessons/12_runtime_portability/02_portable_web_apis.ts
```

## Command map

| Task                     | Node.js/npm                                             | Deno                 | Bun               |
| ------------------------ | ------------------------------------------------------- | -------------------- | ----------------- |
| Run TypeScript           | `npx tsx file.ts` or `node file.ts` for erasable syntax | `deno run file.ts`   | `bun run file.ts` |
| Type-check               | `npx tsc --noEmit`                                      | `deno check file.ts` | use `tsc`         |
| Install package metadata | `npm install`                                           | `deno install`       | `bun install`     |
| Run script               | `npm run name`                                          | `deno task name`     | `bun run name`    |
| Test                     | `node --test`                                           | `deno test`          | `bun test`        |

Deno requires explicit permissions for sensitive operations. Bun and Deno
provide substantial Node compatibility, but neither is a byte-for-byte Node
implementation. As of July 2026, Bun does not implement `node:sqlite`, so the
capstone's SQLite adapter remains intentionally Node-specific.

## Portability checklist

1. Keep the domain model free of runtime imports.
2. Prefer ES modules and explicit extensions.
3. Prefer Web APIs when they meet the requirement.
4. Hide runtime APIs behind small interfaces.
5. Test each claimed runtime in CI.
6. Document intentionally non-portable adapters.

## Common mistakes

- treating TypeScript support as identical type-checking behavior;
- assuming npm compatibility means complete Node API compatibility;
- running Deno with broad `-A` permissions without understanding them;
- using a runtime-specific global deep inside domain code; and
- claiming the full capstone is portable after testing only one small script.

## Review questions

1. Which features belong to JavaScript rather than a runtime?
2. Why is `fetch` often more portable than a runtime-specific HTTP client?
3. What security design distinguishes Deno?
4. Why should database code sit behind an adapter?
5. What evidence supports a portability claim?

Continue with the
[matching exercise](../../exercises/12_runtime_portability/).
