import {
  emptyTaskDocument,
  parseTaskDocument,
  serializeTaskDocument,
  type TaskDocument,
} from "../task-core/task-document.ts";
import { TaskNotFoundError, type TaskStorage } from "../task-core/storage.ts";
import { normalizeTitle, type Task, validateTaskId } from "../task-core/task.ts";

// Deno file backend built on Deno.* runtime-native APIs (readTextFile, rename,
// chmod) instead of node:fs. Concurrency is handled by an in-process promise
// queue plus a createNew temp file per write; unlike the Node backend it does
// not take a cross-process lock, so it assumes a single writer process.

// Deno has no node:path, so derive the parent directory manually and keep the
// backend dependency-free.
function parentDirectory(path: string): string {
  const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return index < 0 ? "." : path.slice(0, index) || "/";
}

export class DenoFileTaskStorage implements TaskStorage {
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

  // Serializes read-modify-write cycles within this process by chaining every
  // operation onto the previous one, regardless of whether it resolved or
  // rejected, so concurrent calls cannot interleave and lose writes.
  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  // A missing file is a valid empty store; other failures (including invalid
  // JSON rejected by parseTaskDocument) propagate.
  private async load(): Promise<TaskDocument> {
    try {
      const text = await Deno.readTextFile(this.file);
      return parseTaskDocument(JSON.parse(text) as unknown);
    } catch (error: unknown) {
      if (error instanceof Deno.errors.NotFound) {
        return emptyTaskDocument;
      }
      throw error;
    }
  }

  // Atomic write: createNew guarantees a fresh unique temp file (never clobber
  // a leftover), permissions mirror the existing file (chmod is skipped on
  // Windows where modes are meaningless), and rename atomically replaces the
  // target. The temp file is always cleaned up, tolerating a missing file.
  private async save(document: TaskDocument): Promise<void> {
    await Deno.mkdir(parentDirectory(this.file), { recursive: true });
    const temporary = `${this.file}.${Deno.pid}.${crypto.randomUUID()}.tmp`;
    let mode = 0o600;
    try {
      mode = ((await Deno.stat(this.file)).mode ?? mode) & 0o777;
    } catch (error: unknown) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    }

    try {
      await Deno.writeTextFile(temporary, serializeTaskDocument(document), {
        createNew: true,
        mode,
      });
      if (Deno.build.os !== "windows") {
        await Deno.chmod(temporary, mode);
      }
      await Deno.rename(temporary, this.file);
    } finally {
      await Deno.remove(temporary).catch((error: unknown) => {
        if (!(error instanceof Deno.errors.NotFound)) {
          throw error;
        }
      });
    }
  }
}
