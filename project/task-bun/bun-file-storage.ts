import { chmod, mkdir, rename, rm, stat } from "node:fs/promises";
import { dirname } from "node:path";

import {
  emptyTaskDocument,
  parseTaskDocument,
  serializeTaskDocument,
  type TaskDocument,
} from "../task-core/task-document.ts";
import { TaskNotFoundError, type TaskStorage } from "../task-core/storage.ts";
import { normalizeTitle, type Task, validateTaskId } from "../task-core/task.ts";

// Bun file backend. It mixes Bun-native I/O (Bun.file, Bun.write) with node:fs
// helpers Bun implements (mkdir/rename/chmod), showing Bun's Node compatibility.
// Like the Deno backend it relies on an in-process queue and per-write unique
// temp files, not a cross-process lock, so it assumes a single writer process.
export class BunFileTaskStorage implements TaskStorage {
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  list(): Promise<readonly Task[]> {
    return this.exclusive(async () => {
      const document = await this.load();
      return document.tasks.map((task) => ({ ...task }));
    });
  }

  add(title: string): Promise<Task> {
    return this.exclusive(async () => {
      const document = await this.load();
      const task: Task = {
        id: document.nextId,
        title: normalizeTitle(title),
        completed: false,
      };
      await this.save({
        version: 1,
        nextId: document.nextId + 1,
        tasks: [...document.tasks, task],
      });
      return { ...task };
    });
  }

  complete(id: number): Promise<Task> {
    return this.exclusive(async () => {
      validateTaskId(id);
      const document = await this.load();
      const index = document.tasks.findIndex((task) => task.id === id);
      if (index < 0) {
        throw new TaskNotFoundError(id);
      }

      const completed: Task = { ...document.tasks[index]!, completed: true };
      const tasks = [...document.tasks];
      tasks[index] = completed;
      await this.save({ ...document, tasks });
      return { ...completed };
    });
  }

  remove(id: number): Promise<void> {
    return this.exclusive(async () => {
      validateTaskId(id);
      const document = await this.load();
      const tasks = document.tasks.filter((task) => task.id !== id);
      if (tasks.length === document.tasks.length) {
        throw new TaskNotFoundError(id);
      }
      await this.save({ ...document, tasks });
    });
  }

  // Serializes read-modify-write cycles within this process; each call chains
  // onto the prior one whether it resolved or rejected, so writes never
  // interleave and lose updates.
  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  // A missing file reads as an empty store; a present but malformed file is
  // rejected by parseTaskDocument.
  private async load(): Promise<TaskDocument> {
    const file = Bun.file(this.filePath);
    if (!(await file.exists())) {
      return emptyTaskDocument;
    }
    return parseTaskDocument(JSON.parse(await file.text()) as unknown);
  }

  // Atomic write: serialize to a unique temp file, mirror the existing file's
  // mode (skipped on Windows), then rename over the target so readers never see
  // a partial document. The temp file is always removed in finally.
  private async save(document: TaskDocument): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${crypto.randomUUID()}.tmp`;
    let mode = 0o600;
    try {
      mode = (await stat(this.filePath)).mode & 0o777;
    } catch (error: unknown) {
      if (
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        error.code !== "ENOENT"
      ) {
        throw error;
      }
    }
    try {
      await Bun.write(temporaryPath, serializeTaskDocument(document));
      if (process.platform !== "win32") {
        await chmod(temporaryPath, mode);
      }
      await rename(temporaryPath, this.filePath);
    } finally {
      await rm(temporaryPath, { force: true });
    }
  }
}
