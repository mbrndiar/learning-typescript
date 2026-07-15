import assert from "node:assert/strict";
import { test } from "node:test";

import { TaskNotFoundError, type TaskStorage } from "../task-core/storage.ts";

export interface StorageFixture {
  readonly storage: TaskStorage;
  close?(): void | Promise<void>;
}

export function registerStorageContract(
  name: string,
  createFixture: () => Promise<StorageFixture>,
): void {
  test(`${name} satisfies the storage contract`, async (context) => {
    const fixture = await createFixture();
    context.after(async () => fixture.close?.());
    const { storage } = fixture;

    assert.deepEqual(await storage.list(), []);

    const first = await storage.add("First");
    const second = await storage.add("Second");
    assert.deepEqual(
      [first.id, second.id],
      [1, 2],
      "identifiers are positive and increasing",
    );
    assert.equal(first.completed, false);

    const completed = await storage.complete(first.id);
    assert.equal(completed.completed, true);

    await storage.remove(first.id);
    await assert.rejects(
      storage.complete(first.id),
      (error) => error instanceof TaskNotFoundError && error.taskId === first.id,
    );

    const third = await storage.add("Third");
    assert.equal(third.id, 3, "removed identifiers are not reused");
    assert.deepEqual(
      (await storage.list()).map((task) => task.id),
      [2, 3],
    );
  });
}
