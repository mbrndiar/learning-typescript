# Exercise: Parse CLI Options

Implement a pure `parseArguments` function for:

```text
task list [--json]
task add <title>
```

Reject unknown flags, missing titles, and extra values with a useful error.

```bash
node --import=tsx --test exercises/09_tooling_debugging_cli_observability/solution.test.ts
```

The committed test imports `solution.ts`. Temporarily change the import to
`exercise.ts` to run the cases against your parser.
