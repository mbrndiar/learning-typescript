# 🧠 Exercise: Parse CLI Options

Implement a pure `parseArguments` function for:

```text
task list [--json]
task add <title>
```

Reject unknown flags, missing titles, and extra values with a useful error.

```bash
EXERCISE_IMPLEMENTATION=exercise \
  node --import=tsx --test exercises/09_tooling_debugging_cli_observability/solution.test.ts
node --import=tsx --test exercises/09_tooling_debugging_cli_observability/solution.test.ts
```

The first command selects your starter; the second selects the reference solution.
