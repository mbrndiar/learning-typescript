# 🌊 Exercise: Stream Tasks as JSON Lines

## 🎯 Goal

Implement `exportTasks` and `importTasks` in `exercise.ts`. The functions form a
Node-specific streaming boundary for the local runtime-neutral `Task` model.

## 📜 Contract

- export one validated task as compact JSON followed by `\n`;
- use `pipeline` so writable errors and backpressure are handled;
- import arbitrary byte chunks without assuming chunk and line boundaries match;
- preserve split UTF-8 characters;
- accept `\n`, `\r\n`, and a final line without a newline;
- ignore blank lines;
- report malformed JSON and invalid tasks with their physical line number;
- reject duplicate task IDs;
- reject a pending line larger than `maxLineBytes`; and
- avoid reading or concatenating the complete input before parsing records.

No external dependency is needed. Reuse `parseTask` from `task.ts` instead of
duplicating domain validation.

## ▶️ Run the tests

From `learning-typescript`:

```bash
node --import=tsx --test exercises/12_nodejs_runtime/solution.test.ts
npm run typecheck:node
```

The committed tests import `solution.ts`. Temporarily change that import to
`exercise.ts` while working, then restore it before comparing your implementation
with the solution.

## 💡 Hints

- `Readable.from` can adapt an iterable or async iterable into a stream.
- An async generator can serialize one task at a time.
- `StringDecoder` preserves a multi-byte UTF-8 character split across chunks.
- Repeatedly remove complete lines from a small pending buffer.
- `for await...of` consumes a readable stream incrementally.

## ⚠️ Common mistakes

- using `JSON.stringify(tasks)` and retaining the entire export in memory;
- assuming every chunk contains exactly one line;
- converting each chunk independently with `chunk.toString("utf8")`;
- writing manually without waiting for `drain`;
- losing the original physical line number after skipping blank lines; and
- swallowing a destination stream error.

## ❓ Review questions

1. Why does `pipeline` make export failure handling safer?
2. Why is a streaming decoder needed for arbitrary UTF-8 chunks?
3. What limits the amount of memory retained by the importer?
4. Which validation belongs to the JSON Lines boundary versus `parseTask`?
