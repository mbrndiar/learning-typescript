import {
  emptyTaskDocument,
  parseTaskDocument,
  serializeTaskDocument,
  type TaskDocument,
} from "../task-core/task-document.ts";
import { TaskNotFoundError, type TaskStorage } from "../task-core/storage.ts";
import { normalizeTitle, type Task, validateTaskId } from "../task-core/task.ts";

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

  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

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
