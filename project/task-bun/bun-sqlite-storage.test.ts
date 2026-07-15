import { expect, test } from "bun:test";
import { chmod, stat } from "node:fs/promises";

import { BunSqliteTaskStorage } from "./bun-sqlite-storage.ts";
import {
  createArtifactDirectory,
  registerStorageContract,
  removeArtifactDirectory,
} from "./test-support.ts";

registerStorageContract("BunSqliteTaskStorage", async () => {
  const storage = new BunSqliteTaskStorage();
  return {
    storage,
    close: () => storage.close(),
  };
});

// Writing to a file path (not :memory:) and reopening it must return the same
// task, proving the database's on-disk lifecycle actually persists.
test("BunSqliteTaskStorage persists after reopening a file database", async () => {
  const directory = await createArtifactDirectory("sqlite-persistence");
  const path = `${directory}/tasks.sqlite`;
  try {
    const first = new BunSqliteTaskStorage(path);
    await first.add("Persisted");
    first.close();

    const reopened = new BunSqliteTaskStorage(path);
    try {
      expect(await reopened.list()).toEqual([
        { id: 1, title: "Persisted", completed: false },
      ]);
    } finally {
      reopened.close();
    }
  } finally {
    await removeArtifactDirectory(directory);
  }
});

// bun:sqlite creates files world-readable, so the backend must re-apply a
// private 0o600 on creation and preserve an existing 0o660 on reopen. Skipped
// on Windows, which has no POSIX modes.
test.skipIf(process.platform === "win32")(
  "BunSqliteTaskStorage creates private databases and preserves existing modes",
  async () => {
    const directory = await createArtifactDirectory("sqlite-mode");
    const path = `${directory}/tasks.sqlite`;
    try {
      const first = new BunSqliteTaskStorage(path);
      first.close();
      expect((await stat(path)).mode & 0o777).toBe(0o600);

      await chmod(path, 0o660);
      const reopened = new BunSqliteTaskStorage(path);
      reopened.close();
      expect((await stat(path)).mode & 0o777).toBe(0o660);
    } finally {
      await removeArtifactDirectory(directory);
    }
  },
);
