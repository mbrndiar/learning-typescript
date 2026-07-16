import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const requestedTrack = process.argv[2] ?? "all";
if (
  requestedTrack !== "all" &&
  requestedTrack !== "comparative" &&
  requestedTrack !== "idiomatic"
) {
  throw new TypeError("capstone track must be all, comparative, or idiomatic");
}

async function collectTests(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const tests: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      tests.push(...(await collectTests(path)));
    } else if (entry.name.endsWith(".test.ts")) {
      tests.push(path);
    }
  }
  return tests;
}

const tracks =
  requestedTrack === "all" ? (["comparative", "idiomatic"] as const) : [requestedTrack];
const tests = (
  await Promise.all(
    tracks.map((track) => collectTests(`capstones/${track}/tests/node`)),
  )
)
  .flat()
  .sort();

if (tests.length === 0) {
  throw new Error(`no Node.js capstone tests were found for ${requestedTrack}`);
}

const child = spawn(process.execPath, ["--import=tsx", "--test", ...tests], {
  stdio: "inherit",
});

const exitCode = await new Promise<number>((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code, signal) => {
    if (signal !== null) {
      reject(new Error(`Node.js capstone tests terminated by ${signal}`));
    } else {
      resolve(code ?? 1);
    }
  });
});
process.exitCode = exitCode;
