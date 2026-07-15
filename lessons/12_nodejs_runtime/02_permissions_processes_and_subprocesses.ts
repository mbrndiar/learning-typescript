import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";

interface CloseResult {
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
}

process.once("beforeExit", (code) => {
  console.log(`beforeExit: event loop drained with code ${code}`);
});
process.once("exit", (code) => {
  console.log(`exit: synchronous cleanup only, code ${code}`);
});

const permissionProbe = spawnSync(
  process.execPath,
  [
    "--permission",
    "--input-type=module",
    "--eval",
    `
      import { readFileSync } from "node:fs";
      readFileSync(process.argv[1], "utf8");
    `,
    import.meta.filename,
  ],
  { encoding: "utf8" },
);

assert.notEqual(permissionProbe.status, 0);
console.log("permission probe denied an undeclared file read");
console.log("warning: Node permissions reduce authority; they are not a sandbox");

const controller = new AbortController();
const child = spawn(process.execPath, ["--eval", "setTimeout(() => {}, 10_000)"], {
  signal: controller.signal,
  stdio: "ignore",
});

const childError = new Promise<Error>((resolve) => {
  child.once("error", resolve);
});
const childClose = new Promise<CloseResult>((resolve) => {
  child.once("close", (code, signal) => {
    resolve({ code, signal });
  });
});
const deadline = setTimeout(() => {
  controller.abort(new Error("subprocess deadline exceeded"));
}, 25);

try {
  const [error, close] = await Promise.all([childError, childClose]);
  assert.equal(error.name, "AbortError");
  assert.equal(close.code, null);
  assert.notEqual(close.signal, null);
  console.log(`subprocess cancelled and closed with ${close.signal}`);
} finally {
  clearTimeout(deadline);
}

async function managedOperation(): Promise<void> {
  let resourceOpen = true;
  try {
    await Promise.resolve();
    assert.equal(resourceOpen, true);
  } finally {
    resourceOpen = false;
    assert.equal(resourceOpen, false);
    console.log("resource released in finally");
  }
}

await managedOperation();
