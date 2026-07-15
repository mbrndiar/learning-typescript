# Exercise: Validate a JSON Task List

Implement `parseTasks` in `exercise.ts`.

The input is untrusted. Accept only an array of objects containing a positive
integer `id`, a non-empty string `title`, and a boolean `done`. Return normalized
tasks or throw `TypeError` with a useful message.

```bash
node --import=tsx --test exercises/07_errors_files_json_and_packages/solution.test.ts
```

The committed test imports `solution.ts` so CI can verify the reference answer.
Temporarily change that import to `exercise.ts` to test your implementation.
