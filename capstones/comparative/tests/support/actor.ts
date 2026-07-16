import { spawn } from "node:child_process";
import { access, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

const ready = requiredEnvironment("KV_ACTOR_READY");
const release = requiredEnvironment("KV_ACTOR_RELEASE");
const entry = requiredEnvironment("KV_ACTOR_ENTRY");
const arguments_ = JSON.parse(requiredEnvironment("KV_ACTOR_ARGS")) as unknown;

if (
  !Array.isArray(arguments_) ||
  !arguments_.every((value) => typeof value === "string")
) {
  process.exitCode = 1;
} else {
  await writeFile(ready, "ready");
  while (!(await exists(release))) {
    await delay(10);
  }

  const child = spawn(process.execPath, ["--import=tsx", entry, ...arguments_], {
    stdio: ["ignore", "inherit", "inherit"],
  });
  process.exitCode = await new Promise<number>((resolve) => {
    child.once("error", () => resolve(1));
    child.once("exit", (code, signal) => resolve(signal === null ? (code ?? 1) : 1));
  });
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`${name} must be set`);
  }
  return value;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
