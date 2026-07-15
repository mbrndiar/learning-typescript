import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { lock } from "proper-lockfile";

import {
  emptyTaskDocument,
  parseTaskDocument,
  serializeTaskDocument,
  type TaskDocument,
} from "../task-core/task-document.ts";
import { TaskNotFoundError, type TaskStorage } from "../task-core/storage.ts";
import { normalizeTitle, type Task, validateTaskId } from "../task-core/task.ts";

// The Node file backend. Every mutation is read-modify-write of the whole JSON
// document, so correctness under concurrency depends on two independent layers:
// an in-process promise queue that serializes overlapping calls within one
// process, and a cross-process advisory file lock that guards against other
// processes touching the same file. Neither alone is sufficient.
export class FileTaskStorage implements TaskStorage {
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly file: string) {}

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

  // Serializes operations within this process: each call chains onto the
  // previous one (regardless of success or failure) so a read-modify-write
  // never interleaves with another in the same process before the file lock
  // is even acquired.
  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const lockedOperation = () => this.withFileLock(operation);
    const result = this.queue.then(lockedOperation, lockedOperation);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  // Guards against other processes. The stale/update settings recover from a
  // crashed holder, and bounded retries let brief contention resolve instead
  // of failing immediately. The lock is always released in finally.
  private async withFileLock<T>(operation: () => Promise<T>): Promise<T> {
    await mkdir(dirname(this.file), { recursive: true });
    const release = await lock(this.file, {
      realpath: false,
      stale: 10_000,
      update: 2_000,
      retries: {
        retries: 50,
        factor: 1,
        minTimeout: 20,
        maxTimeout: 100,
      },
    });
    try {
      return await operation();
    } finally {
      await release();
    }
  }

  // Narrow an unknown thrown value to a Node errno error without assertions,
  // so callers can distinguish "file missing" from real I/O failures.
  private hasCode(error: unknown, code: string): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === code
    );
  }

  // A missing file is a valid empty store, not an error; any other failure
  // (including corrupt JSON via parseTaskDocument) propagates.
  private async load(): Promise<TaskDocument> {
    try {
      const text = await readFile(this.file, "utf8");
      return parseTaskDocument(JSON.parse(text) as unknown);
    } catch (error: unknown) {
      if (this.hasCode(error, "ENOENT")) {
        return emptyTaskDocument;
      }
      throw error;
    }
  }

  // Atomic write: serialize to a uniquely named temp file in the same
  // directory, then rename over the target so readers never observe a partial
  // document. The existing file mode is preserved (defaulting to 0o600 for a
  // new file) and the temp file is removed on any failure.
  private async save(document: TaskDocument): Promise<void> {
    await mkdir(dirname(this.file), { recursive: true });
    const temporaryFile = `${this.file}.${process.pid}.${randomUUID()}.tmp`;
    let mode = 0o600;
    try {
      mode = (await stat(this.file)).mode & 0o777;
    } catch (error: unknown) {
      if (!this.hasCode(error, "ENOENT")) {
        throw error;
      }
    }
    try {
      await writeFile(temporaryFile, serializeTaskDocument(document), {
        encoding: "utf8",
        mode,
      });
      await chmod(temporaryFile, mode);
      await rename(temporaryFile, this.file);
    } finally {
      await rm(temporaryFile, { force: true });
    }
  }
}
