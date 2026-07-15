import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

// Collects and runs the Node-runnable project tests under node:test. It skips
// the task-deno and task-bun trees because those tests use runtime-specific
// frameworks (Deno.test, bun:test) that only their own runner understands, and
// have dedicated scripts. Selecting *.test.ts recursively keeps new tests
// included automatically.
async function collectTests(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const tests: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (
      entry.isDirectory() &&
      (entry.name === "task-deno" || entry.name === "task-bun")
    ) {
      continue;
    }
    if (entry.isDirectory()) {
      tests.push(...(await collectTests(path)));
    } else if (entry.name.endsWith(".test.ts")) {
      tests.push(path);
    }
  }

  return tests;
}

const tests = (await collectTests("project")).sort();
if (tests.length === 0) {
  throw new Error("no project tests were found");
}

// Opt-in coverage thresholds: only enforced when --coverage is passed so the
// default developer loop stays fast, while CI can gate on coverage.
const coverageArguments = process.argv.includes("--coverage")
  ? [
      "--experimental-test-coverage",
      "--test-coverage-lines=85",
      "--test-coverage-functions=85",
      "--test-coverage-branches=80",
    ]
  : [];

const child = spawn(
  process.execPath,
  ["--import=tsx", "--test", ...coverageArguments, ...tests],
  { stdio: "inherit" },
);

// Forward the child's exit code as ours so the script fails when tests fail,
// and treat termination by signal as a failure rather than a silent pass.
const exitCode = await new Promise<number>((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code, signal) => {
    if (signal !== null) {
      reject(new Error(`project tests terminated by ${signal}`));
    } else {
      resolve(code ?? 1);
    }
  });
});

process.exitCode = exitCode;
