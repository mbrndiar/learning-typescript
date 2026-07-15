import { expect, test } from "bun:test";
import { chmod, readdir, stat } from "node:fs/promises";

import { BunFileTaskStorage } from "./bun-file-storage.ts";
import {
  createArtifactDirectory,
  registerStorageContract,
  removeArtifactDirectory,
} from "./test-support.ts";

registerStorageContract("BunFileTaskStorage", async () => {
  const directory = await createArtifactDirectory("file-contract");
  return {
    storage: new BunFileTaskStorage(`${directory}/tasks.json`),
    close: () => removeArtifactDirectory(directory),
  };
});

// Overlapping add() calls must yield contiguous ids, the exact persisted
// document, and no leftover .tmp files, proving the in-process queue serialized
// the writes and every atomic rename cleaned up its temp file.
test("BunFileTaskStorage serializes writes within one instance", async () => {
  const directory = await createArtifactDirectory("file-concurrency");
  try {
    const filePath = `${directory}/tasks.json`;
    const storage = new BunFileTaskStorage(filePath);

    await Promise.all(["one", "two", "three"].map((title) => storage.add(title)));

    expect((await storage.list()).map((task) => task.id)).toEqual([1, 2, 3]);
    expect(await Bun.file(filePath).json()).toEqual({
      version: 1,
      nextId: 4,
      tasks: [
        { id: 1, title: "one", completed: false },
        { id: 2, title: "two", completed: false },
        { id: 3, title: "three", completed: false },
      ],
    });
    expect((await readdir(directory)).filter((name) => name.endsWith(".tmp"))).toEqual(
      [],
    );
  } finally {
    await removeArtifactDirectory(directory);
  }
});

// A structurally valid JSON file that violates the Task schema (missing title)
// must be rejected on load, not silently accepted.
test("BunFileTaskStorage rejects a corrupt task document", async () => {
  const directory = await createArtifactDirectory("file-corrupt");
  try {
    const filePath = `${directory}/tasks.json`;
    await Bun.write(filePath, '{"version":1,"nextId":1,"tasks":[{"id":1}]}\n');

    await expect(new BunFileTaskStorage(filePath).list()).rejects.toThrow(/title/);
  } finally {
    await removeArtifactDirectory(directory);
  }
});

// New files must default to a private 0o600, and a later mutation must preserve
// a widened-by-the-user 0o660 rather than resetting it. Skipped on Windows,
// which has no POSIX modes.
test.skipIf(process.platform === "win32")(
  "BunFileTaskStorage creates private files and preserves restrictive modes",
  async () => {
    const directory = await createArtifactDirectory("file-mode");
    try {
      const filePath = `${directory}/tasks.json`;
      const storage = new BunFileTaskStorage(filePath);
      await storage.add("Private");
      expect((await stat(filePath)).mode & 0o777).toBe(0o600);

      await chmod(filePath, 0o660);
      await storage.add("Shared with group");
      expect((await stat(filePath)).mode & 0o777).toBe(0o660);
    } finally {
      await removeArtifactDirectory(directory);
    }
  },
);
