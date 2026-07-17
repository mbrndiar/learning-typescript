# 🧠 Exercise: Plan Least-Privilege Deno Flags

## 🎯 Goal

Implement `permissionFlags` in `exercise.ts`. A file-backed CLI needs read and write access only to
its data directory. A local HTTP server needs network access only to its configured listener. Never
return `-A`.

## ✅ Requirements

- preserve deterministic flag order;
- validate that HTTP ports are integers from 0 through 65535;
- grant no unrelated environment, subprocess, FFI, or system permissions; and
- keep the function runtime-neutral so it needs no permissions to test.

## ▶️ Run

The committed test imports `solution.ts`. Point it at `exercise.ts` while working.

```bash
deno test exercises/14_deno_runtime/solution.test.ts
```

## 💡 Hint

Model the two programs as a discriminated union and narrow on `kind`.
