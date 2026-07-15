import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { registerStorageContract } from "../test-support/storage-contract.ts";
import { FileTaskStorage } from "./file-storage.ts";

function addFromProcess(file: string, title: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--import=tsx", "project/task-manager/main.ts", "--file", file, "add", title],
      { cwd: process.cwd(), stdio: "ignore" },
    );
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal !== null) {
        reject(new Error(`child terminated by ${signal}`));
      } else if (code !== 0) {
        reject(new Error(`child exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

registerStorageContract("FileTaskStorage", async () => {
  const directory = await mkdtemp(join(tmpdir(), "task-file-contract-"));
  return {
    storage: new FileTaskStorage(join(directory, "tasks.json")),
    close: () => rm(directory, { recursive: true, force: true }),
  };
});

test("FileTaskStorage serializes concurrent writes", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "task-file-concurrent-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "tasks.json");
  const storage = new FileTaskStorage(file);

  await Promise.all(["one", "two", "three"].map((title) => storage.add(title)));

  assert.deepEqual(
    (await storage.list()).map((task) => task.id),
    [1, 2, 3],
  );
  const document = JSON.parse(await readFile(file, "utf8")) as unknown;
  assert.equal(typeof document, "object");
});

test("FileTaskStorage rejects a corrupt document", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "task-file-corrupt-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "tasks.json");
  await writeFile(file, '{"version":1,"nextId":1,"tasks":[{"id":1}]}', "utf8");

  await assert.rejects(new FileTaskStorage(file).list(), /title/);
});

test("FileTaskStorage coordinates separate CLI processes", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "task-file-processes-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "tasks.json");

  await Promise.all(
    ["one", "two", "three", "four", "five"].map((title) => addFromProcess(file, title)),
  );

  assert.deepEqual(
    (await new FileTaskStorage(file).list()).map((task) => task.id),
    [1, 2, 3, 4, 5],
  );
});

test("FileTaskStorage preserves restrictive file permissions", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "task-file-mode-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const file = join(directory, "tasks.json");
  await writeFile(file, '{"version":1,"nextId":1,"tasks":[]}\n', {
    encoding: "utf8",
    mode: 0o660,
  });
  await chmod(file, 0o660);

  await new FileTaskStorage(file).add("Private task");

  assert.equal((await stat(file)).mode & 0o777, 0o660);
});
