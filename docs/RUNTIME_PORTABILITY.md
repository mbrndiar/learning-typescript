# 🌐 Runtime Portability

The course uses Node.js as the reference runtime. The final module revisits a
selected subset under Deno and Bun.

## 🌐 Portable first choices

- JavaScript language features and strict TypeScript types
- ES modules with explicit file extensions
- Web APIs such as `URL`, `fetch`, `AbortController`, streams, and Web Crypto
- explicit `node:` imports when a Node compatibility API is required
- small adapters around files, processes, tests, and databases

## ⚠️ Important differences

| Concern          | Node.js                      | Deno                           | Bun                                 |
| ---------------- | ---------------------------- | ------------------------------ | ----------------------------------- |
| Package metadata | `package.json`/npm           | `deno.json` and `package.json` | `package.json`/npm-compatible       |
| TypeScript       | type stripping or tool       | built in                       | built in                            |
| Permissions      | process authority by default | explicit permissions           | process authority by default        |
| Node APIs        | reference implementation     | compatibility layer            | compatibility layer                 |
| Test runner      | `node:test`                  | `deno test` plus compatibility | `bun:test` plus partial `node:test` |
| `node:sqlite`    | available                    | do not assume compatibility    | not implemented as of July 2026     |

Portability is a tested property, not a label. The course's portability smoke
tests intentionally exclude the Node-specific SQLite adapter.
