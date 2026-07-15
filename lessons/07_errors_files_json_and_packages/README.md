# 🚨 7. Errors, Files, JSON, and Packages

## 🎯 Learning goals

- treat caught errors and decoded JSON as `unknown`;
- validate untrusted values before assigning domain types;
- use `node:fs/promises`, `URL`, and `node:path` safely;
- clean up resources with `try`/`finally`; and
- distinguish built-in modules, local modules, and npm packages.

## ▶️ Run the lessons

```bash
npm run lesson -- lessons/07_errors_files_json_and_packages/01_unknown_json_and_errors.ts
npm run lesson -- lessons/07_errors_files_json_and_packages/02_files_paths_and_cleanup.ts
```

TypeScript checks code, not external data. `JSON.parse`, files, environment
variables, and package responses cross a runtime boundary and must be validated.
Prefer returning a useful domain error over allowing a distant property access
to fail.

Use `node:` specifiers for Node built-ins. They make the dependency source
explicit and are also understood by compatibility layers in Deno and Bun.

## ⚠️ Common mistakes

- writing `const task = JSON.parse(text) as Task` without validation;
- catching an error and assuming it has a `.message` property;
- building paths by concatenating `/` or `\`;
- forgetting to close or remove resources in failure paths; and
- installing a package before checking whether the runtime already provides the
  required API.

## ❓ Review questions

1. Why does a TypeScript type disappear at runtime?
2. When should a caught value be narrowed with `instanceof Error`?
3. Why is a file URL often safer than a working-directory-relative path?
4. What does the `node:` prefix communicate?
5. Which cleanup belongs in a `finally` block?

Continue with the
[matching exercise](../../exercises/07_errors_files_json_and_packages/).
