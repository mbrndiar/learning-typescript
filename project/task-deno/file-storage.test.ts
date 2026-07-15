import { TaskNotFoundError } from "../task-core/storage.ts";
import { DenoFileTaskStorage } from "./file-storage.ts";
import { assert, assertEquals, assertRejects } from "./test-support.ts";

// Tests scope Deno permissions to a single directory (filePermissions), so a
// bug that tried to touch paths outside testRoot would fail the sandbox rather
// than silently succeed. Each case uses a unique subdirectory and cleans it up.
const testRoot = "project/task-deno/.test-data";
const filePermissions = { read: [testRoot], write: [testRoot] };

async function withTestFile(
  name: string,
  operation: (file: string) => Promise<void>,
): Promise<void> {
  const directory = `${testRoot}/${name}-${crypto.randomUUID()}`;
  const file = `${directory}/tasks.json`;
  try {
    await operation(file);
  } finally {
    await Deno.remove(directory, { recursive: true }).catch((error: unknown) => {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    });
  }
}

Deno.test({
  name: "DenoFileTaskStorage satisfies the storage contract",
  permissions: filePermissions,
  fn: () =>
    withTestFile("contract", async (file) => {
      const storage = new DenoFileTaskStorage(file);
      assertEquals(await storage.list(), []);

      const first = await storage.add("First");
      const second = await storage.add("Second");
      assertEquals([first.id, second.id], [1, 2]);
      assertEquals(first.completed, false);

      assertEquals((await storage.complete(first.id)).completed, true);
      await storage.remove(first.id);
      await assertRejects(
        () => storage.complete(first.id),
        (error) => error instanceof TaskNotFoundError && error.taskId === first.id,
      );

      const third = await storage.add("Third");
      assertEquals(third.id, 3);
      assertEquals((await storage.list()).map((task) => task.id), [2, 3]);
    }),
});

// Overlapping add() calls must yield contiguous ids and a still-parseable file,
// proving the in-process queue serialized the read-modify-write cycles.
Deno.test({
  name: "DenoFileTaskStorage serializes concurrent writes and emits valid JSON",
  permissions: filePermissions,
  fn: () =>
    withTestFile("concurrent", async (file) => {
      const storage = new DenoFileTaskStorage(file);
      await Promise.all(["one", "two", "three"].map((title) => storage.add(title)));
      assertEquals((await storage.list()).map((task) => task.id), [1, 2, 3]);
      const document = JSON.parse(await Deno.readTextFile(file)) as unknown;
      assert(typeof document === "object" && document !== null);
    }),
});

Deno.test({
  name: "DenoFileTaskStorage rejects corrupt documents",
  permissions: filePermissions,
  fn: () =>
    withTestFile("corrupt", async (file) => {
      await Deno.mkdir(file.slice(0, file.lastIndexOf("/")), { recursive: true });
      await Deno.writeTextFile(file, '{"version":1,"nextId":1,"tasks":[{"id":1}]}');
      await assertRejects(
        () => new DenoFileTaskStorage(file).list(),
        (error) => error instanceof TypeError && error.message.includes("title"),
      );
    }),
});

// The atomic write must not widen a restrictive mode: a 0o660 file stays 0o660
// after a mutation. Skipped on Windows, which has no POSIX modes.
Deno.test({
  name: "DenoFileTaskStorage preserves restrictive modes",
  permissions: filePermissions,
  ignore: Deno.build.os === "windows",
  fn: () =>
    withTestFile("mode", async (file) => {
      await Deno.mkdir(file.slice(0, file.lastIndexOf("/")), { recursive: true });
      await Deno.writeTextFile(file, '{"version":1,"nextId":1,"tasks":[]}\n', {
        mode: 0o660,
      });
      await Deno.chmod(file, 0o660);
      await new DenoFileTaskStorage(file).add("Private");
      assertEquals((await Deno.stat(file)).mode! & 0o777, 0o660);
    }),
});

// Security boundary: with file permissions denied, the backend cannot reach the
// filesystem at all and Deno raises NotCapable. Confirms the sandbox, not the
// code, is the last line of defense and that it cannot be bypassed.
Deno.test({
  name: "DenoFileTaskStorage cannot bypass denied file permissions",
  permissions: { read: false, write: false },
  fn: async () => {
    await assertRejects(
      () => new DenoFileTaskStorage(`${testRoot}/denied/tasks.json`).list(),
      (error) => error instanceof Deno.errors.NotCapable,
    );
  },
});
