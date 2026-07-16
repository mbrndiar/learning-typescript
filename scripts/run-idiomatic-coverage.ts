import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";

const tests = (await readdir("capstones/idiomatic/tests/node"))
  .filter((name) => /^m[1-5].*\.test\.ts$/.test(name))
  .map((name) => `capstones/idiomatic/tests/node/${name}`)
  .sort();

const child = spawn(
  process.execPath,
  [
    "--import=tsx",
    "--test",
    "--experimental-test-coverage",
    "--test-coverage-include=capstones/idiomatic/solution/core/*.ts",
    "--test-coverage-exclude=capstones/idiomatic/solution/core/contracts.ts",
    "--test-coverage-exclude=capstones/idiomatic/solution/core/index.ts",
    "--test-coverage-lines=85",
    "--test-coverage-functions=85",
    "--test-coverage-branches=80",
    ...tests,
  ],
  {
    stdio: "inherit",
    env: { ...process.env, CAPSTONE_IMPLEMENTATION: "solution" },
  },
);

const exitCode = await new Promise<number>((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code, signal) => {
    if (signal !== null) {
      reject(new Error(`idiomatic coverage tests terminated by ${signal}`));
    } else {
      resolve(code ?? 1);
    }
  });
});

process.exitCode = exitCode;
