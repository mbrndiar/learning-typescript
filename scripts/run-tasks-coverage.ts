import { spawn } from "node:child_process";

const child = spawn(
  process.execPath,
  [
    "--import=tsx",
    "--test",
    "--experimental-test-coverage",
    "--test-coverage-include=projects/tasks/solution/client/fetch.ts",
    "--test-coverage-include=projects/tasks/solution/core/*.ts",
    "--test-coverage-include=projects/tasks/solution/storage/markdown.ts",
    "--test-coverage-include=projects/tasks/solution/runtimes/node/*.ts",
    "--test-coverage-exclude=projects/tasks/solution/index.ts",
    "--test-coverage-exclude=projects/tasks/solution/runtimes/node/api-main.ts",
    "--test-coverage-exclude=projects/tasks/solution/runtimes/node/cli-main.ts",
    "--test-coverage-exclude=projects/tasks/solution/runtimes/node/index.ts",
    "--test-coverage-exclude=projects/tasks/solution/runtimes/node/repository.ts",
    "--test-coverage-lines=85",
    "--test-coverage-functions=85",
    "--test-coverage-branches=80",
    "projects/tasks/tests/node.test.ts",
    "projects/tasks/tests/node-coverage.test.ts",
  ],
  {
    stdio: "inherit",
    env: { ...process.env, TASKS_IMPLEMENTATION: "solution" },
  },
);

const exitCode = await new Promise<number>((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code, signal) => {
    if (signal !== null) {
      reject(new Error(`Tasks coverage tests terminated by ${signal}`));
    } else {
      resolve(code ?? 1);
    }
  });
});

process.exitCode = exitCode;
