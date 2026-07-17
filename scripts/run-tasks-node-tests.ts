import { spawn } from "node:child_process";

const implementation = process.env.TASKS_IMPLEMENTATION ?? "starter";
if (implementation !== "starter" && implementation !== "solution") {
  throw new Error("TASKS_IMPLEMENTATION must be starter or solution");
}

const child = spawn(
  process.execPath,
  ["--import=tsx", "--test", "projects/tasks/tests/node.test.ts"],
  {
    stdio: "inherit",
    env: { ...process.env, TASKS_IMPLEMENTATION: implementation },
  },
);

const exitCode = await new Promise<number>((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code, signal) => {
    if (signal !== null) {
      reject(new Error(`Tasks Node.js tests terminated by ${signal}`));
    } else {
      resolve(code ?? 1);
    }
  });
});

process.exitCode = exitCode;
