import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

// Runs the Node-compatible test suites across lessons, exercises, and project
// in a single node:test invocation. The Deno- and Bun-specific chapters and
// project packages are excluded because their tests target runtime-specific
// frameworks that node:test cannot execute.
async function collectTests(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const tests: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (
      entry.isDirectory() &&
      (entry.name === "13_deno_runtime" ||
        entry.name === "14_bun_runtime" ||
        entry.name === "task-deno" ||
        entry.name === "task-bun")
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

const tests = (
  await Promise.all(
    ["lessons", "exercises", "project"].map((directory) => collectTests(directory)),
  )
)
  .flat()
  .sort();

if (tests.length === 0) {
  throw new Error("no Node.js tests were found");
}

const child = spawn(process.execPath, ["--import=tsx", "--test", ...tests], {
  stdio: "inherit",
});

const exitCode = await new Promise<number>((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code, signal) => {
    if (signal !== null) {
      reject(new Error(`Node.js tests terminated by ${signal}`));
    } else {
      resolve(code ?? 1);
    }
  });
});

process.exitCode = exitCode;
