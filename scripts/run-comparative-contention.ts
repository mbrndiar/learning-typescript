import { spawn } from "node:child_process";

const child = spawn(
  process.execPath,
  ["--import=tsx", "--test", "capstones/comparative/tests/node/m5-conformance.test.ts"],
  {
    stdio: "inherit",
    env: { ...process.env, CAPSTONE_IMPLEMENTATION: "solution" },
  },
);

process.exitCode = await new Promise<number>((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code, signal) => {
    if (signal !== null) {
      reject(new Error(`comparative contention tests terminated by ${signal}`));
    } else {
      resolve(code ?? 1);
    }
  });
});
