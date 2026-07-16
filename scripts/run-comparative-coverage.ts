import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";

const tests = (await readdir("capstones/comparative/tests/node"))
  .filter((name) => /^m[1-5].*\.test\.ts$/.test(name))
  .map((name) => `capstones/comparative/tests/node/${name}`)
  .sort();

const child = spawn(
  process.execPath,
  [
    "--import=tsx",
    "--test",
    "--test-concurrency=1",
    "--experimental-test-coverage",
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

process.exitCode = await new Promise<number>((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code, signal) => {
    if (signal !== null) {
      reject(new Error(`comparative coverage tests terminated by ${signal}`));
    } else {
      resolve(code ?? 1);
    }
  });
});
