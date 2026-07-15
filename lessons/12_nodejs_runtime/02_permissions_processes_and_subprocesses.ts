// This lesson treats process APIs as lifecycle boundaries: permissions limit
// authority before code runs, child processes must be bounded, and cleanup
// must happen before the process is allowed to disappear.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";

interface CloseResult {
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
}

// beforeExit may schedule more work; exit cannot. Keep real cleanup out of
// the exit event when that cleanup needs asynchronous operations.
process.once("beforeExit", (code) => {
  console.log(`beforeExit: event loop drained with code ${code}`);
});
process.once("exit", (code) => {
  console.log(`exit: synchronous cleanup only, code ${code}`);
});

// The child process receives the permission model but no file-read grant, so
// failure proves the read was denied before application logic used the file.
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

// A deadline turns "wait for a child" into bounded work. Observe both error
// and close because aborting a child reports through more than one event.
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

// finally is the durable cleanup location: it runs on success and failure,
// unlike process exit hooks that cannot wait for asynchronous cleanup.
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
