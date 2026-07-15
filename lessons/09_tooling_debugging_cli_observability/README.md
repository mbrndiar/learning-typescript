# 9. Tooling, Debugging, CLI, and Observability

## Learning goals

- separate execution, formatting, linting, and type checking;
- parse command-line arguments without terminating deep inside application code;
- use exit codes for automation-friendly success and failure;
- read stack traces and debug with source-mapped TypeScript;
- emit structured diagnostics to the error stream; and
- avoid logging secrets or success-shaped error messages.

## Run the lessons

```bash
npm run lesson -- lessons/09_tooling_debugging_cli_observability/01_cli_boundaries.ts add "Write tests"
npm run lesson -- lessons/09_tooling_debugging_cli_observability/02_structured_logging.ts
```

Keep a `run(args)` function separate from `process.argv` and `process.exitCode`.
This makes CLI behavior testable without starting a child process. Program
output belongs on stdout; diagnostics belong on stderr.

## Common mistakes

- assuming `tsx` execution also performed a complete type check;
- calling `process.exit()` before buffered output or cleanup finishes;
- mixing command parsing, domain logic, and terminal formatting in one function;
- logging credentials, tokens, or complete environment objects; and
- catching an error only to print it and return success.

## Review questions

1. Which command is authoritative for static type errors?
2. Why return an exit code from `run`?
3. What is the difference between stdout and stderr?
4. What context makes a structured log useful?
5. Why should secrets be allowlisted rather than blocklisted?

Continue with the
[matching exercise](../../exercises/09_tooling_debugging_cli_observability/).
