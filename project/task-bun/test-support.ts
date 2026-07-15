import { expect, test } from "bun:test";
import { mkdir, rm } from "node:fs/promises";

import { TaskNotFoundError, type TaskStorage } from "../task-core/storage.ts";

// Bun's variant of the shared storage contract, expressed with bun:test. Every
// Bun backend runs it so file and SQLite stores are held to the same guarantees
// (positive increasing ids, ids never reused, uniform not-found error) that a
// naive implementation would violate.
export interface StorageFixture {
  readonly storage: TaskStorage;
  close?(): void | Promise<void>;
}

export function registerStorageContract(
  name: string,
  createFixture: () => Promise<StorageFixture>,
): void {
  test(`${name} satisfies the shared storage contract`, async () => {
    const fixture = await createFixture();
    try {
      const { storage } = fixture;
      expect(await storage.list()).toEqual([]);

      const first = await storage.add("First");
      const second = await storage.add("Second");
      expect([first.id, second.id]).toEqual([1, 2]);
      expect(first.completed).toBe(false);

      expect(await storage.complete(first.id)).toEqual({
        ...first,
        completed: true,
      });
      await storage.remove(first.id);
      try {
        await storage.complete(first.id);
        throw new Error("expected a missing task error");
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(TaskNotFoundError);
        expect((error as TaskNotFoundError).taskId).toBe(first.id);
      }

      const third = await storage.add("Third");
      expect(third.id).toBe(3);
      expect((await storage.list()).map((task) => task.id)).toEqual([2, 3]);
    } finally {
      await fixture.close?.();
    }
  });
}

// Artifact helpers create and remove unique directories under the module's own
// folder so file-backed tests never collide and always clean up after themselves.
export async function createArtifactDirectory(prefix: string): Promise<string> {
  const directory = `${import.meta.dir}/.test-artifacts/${prefix}-${crypto.randomUUID()}`;
  await mkdir(directory, { recursive: true });
  return directory;
}

export async function removeArtifactDirectory(directory: string): Promise<void> {
  await rm(directory, { recursive: true, force: true });
}
