import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

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
