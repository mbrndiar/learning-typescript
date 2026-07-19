# 🧪 Exercise: Capture a Bun subprocess report

## 🎯 Goal

Implement `captureJsonReport` in `exercise.ts`. It must:

1. start the supplied command with `Bun.spawn`;
2. pipe and consume both standard output and standard error;
3. enforce the supplied timeout;
4. reject a non-zero exit without exposing an unbounded output buffer;
5. parse standard output as unknown JSON; and
6. persist the exact JSON text with `Bun.write`.

The API is Bun-native for processes and files. `Response` and `Blob` are Web
APIs. No `node:child_process` or `node:fs` import is needed.

## ▶️ Exact commands

```bash
EXERCISE_IMPLEMENTATION=exercise \
  bun test exercises/15_bun_runtime/solution.test.ts
bun test exercises/15_bun_runtime/solution.test.ts
```

The first command selects your starter; the second selects the reference solution.

## 💡 Hints

- use `stdout: "pipe"`, `stderr: "pipe"`, `timeout`, `killSignal`, and
  `maxBuffer`;
- `new Response(stream).text()` consumes a Web `ReadableStream`;
- await output and `subprocess.exited` together; and
- parse before writing so invalid JSON never replaces a valid report.

## ⚠️ Common mistakes

- awaiting the exit before draining a full pipe;
- treating a killed process as success;
- forgetting that `Bun.write` returns the byte count;
- parsing stderr instead of stdout; and
- relying on TypeScript syntax as runtime validation.

## ❓ Review questions

1. Why should stdout, stderr, and the exit promise be observed together?
2. Which parts of the solution are Bun-native and which are Web APIs?
3. Why is parsing performed before writing?
4. What resource limit complements the timeout?

## 🔗 Capstone connection

The [idiomatic Bun adapter](../../capstones/idiomatic/solution/bun/) applies the
same explicit runtime boundaries to durable logs, a CLI, and HTTP.
