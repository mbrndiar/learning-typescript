# 🧠 Exercise: Validate a JSON Task List

Implement `parseTasks` and `normalizeTimestamp` in `exercise.ts`.

The input is untrusted. Accept only an array of objects containing a positive
integer `id`, a non-empty string `title`, and a boolean `done`. Return normalized
tasks or throw `TypeError` with a useful message.

For `normalizeTimestamp`, accept only RFC 3339 date-time text with `Z` or a
numeric offset. Reject impossible calendar dates and return canonical UTC
millisecond form from `toISOString()`.

```bash
EXERCISE_IMPLEMENTATION=exercise \
  node --import=tsx --test exercises/07_errors_files_json_and_packages/solution.test.ts
node --import=tsx --test exercises/07_errors_files_json_and_packages/solution.test.ts
```

The first command selects your starter; the second selects the reference solution.
