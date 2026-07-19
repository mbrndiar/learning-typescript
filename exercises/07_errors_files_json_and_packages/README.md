# 🧠 Exercise: Validate a JSON Task List

Implement `parseTasks`, `normalizeTimestamp`, and `formatTimestampInZone` in
`exercise.ts`.

The input is untrusted. Accept only an array of objects containing a positive
integer `id`, a non-empty string `title`, and a boolean `done`. Return normalized
tasks or throw `TypeError` with a useful message.

For `normalizeTimestamp`, accept only RFC 3339 date-time text with `Z` or a
numeric offset. Reject impossible calendar dates and return canonical UTC
millisecond form from `toISOString()`.

For `formatTimestampInZone`, normalize the instant first, then use
`Intl.DateTimeFormat` with the requested IANA zone. Return deterministic calendar
fields plus the long numeric GMT offset so summer and winter can demonstrate
different daylight-saving rules.

The separate filesystem exercise practices real UTF-8 files and directory
entries:

```bash
EXERCISE_IMPLEMENTATION=exercise \
  node --import=tsx --test exercises/07_errors_files_json_and_packages/solution.test.ts
node --import=tsx --test exercises/07_errors_files_json_and_packages/solution.test.ts
EXERCISE_IMPLEMENTATION=exercise \
  node --import=tsx --test \
  exercises/07_errors_files_json_and_packages/filesystem-solution.test.ts
node --import=tsx --test \
  exercises/07_errors_files_json_and_packages/filesystem-solution.test.ts
```

For each test contract, the command with `EXERCISE_IMPLEMENTATION=exercise`
selects its starter. The following command runs the same contract against the
reference solution.
