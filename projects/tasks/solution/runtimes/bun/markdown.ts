import { rename } from "node:fs/promises";
import {
  LifecycleError,
  StorageError,
  TaskNotFoundError,
  validateTaskId,
  validateTitle,
  type Task,
  type TaskFilter,
  type TaskRepository,
  type UpdateTaskDto,
} from "../../core/index.ts";
import {
  initialMarkdownState,
  parseMarkdownDocument,
  serializeMarkdownDocument,
  SerialExecutor,
  type MarkdownState,
} from "../../storage/markdown.ts";

let temporarySequence = 0;

function parentDirectory(path: string): string {
  const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return index < 0 ? "." : path.slice(0, index) || "/";
}

function fileName(path: string): string {
  const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return path.slice(index + 1);
}

async function publishAtomically(path: string, source: string): Promise<void> {
  const parent = parentDirectory(path);
  temporarySequence += 1;
  const temporary = `${parent}/.${fileName(path)}.${process.pid}.${temporarySequence}.tmp`;
  try {
    await Bun.write(temporary, source, { createPath: false });
    await rename(temporary, path);
  } catch (error) {
    try {
      await Bun.file(temporary).delete();
    } catch (cleanupError) {
      if (await Bun.file(temporary).exists()) {
        throw new StorageError(
          "write markdown",
          "write and cleanup both failed",
          new AggregateError([error, cleanupError]),
        );
      }
    }
    throw new StorageError("write markdown", "atomic publication failed", error);
  }
}

export class BunMarkdownRepository implements TaskRepository {
  readonly #path: string;
  readonly #serial = new SerialExecutor();
  #closed = false;

  constructor(path: string) {
    this.#path = path;
  }

  #assertOpen(): void {
    if (this.#closed) throw new LifecycleError("markdown repository is closed");
  }

  async #load(): Promise<MarkdownState> {
    try {
      const file = Bun.file(this.#path);
      if (!(await file.exists())) {
        const state = initialMarkdownState();
        await publishAtomically(this.#path, serializeMarkdownDocument(state));
        return state;
      }
      return parseMarkdownDocument(await file.text());
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError("read markdown", "could not load document", error);
    }
  }

  create(rawTitle: string): Promise<Task> {
    this.#assertOpen();
    const title = validateTitle(rawTitle);
    return this.#serial.run(async () => {
      const state = await this.#load();
      if (!Number.isSafeInteger(state.nextId + 1)) {
        throw new StorageError("create task", "task id space is exhausted");
      }
      const task = Object.freeze({
        id: state.nextId,
        title,
        completed: false,
      });
      await publishAtomically(
        this.#path,
        serializeMarkdownDocument({
          nextId: state.nextId + 1,
          tasks: Object.freeze([...state.tasks, task]),
        }),
      );
      return task;
    });
  }

  list(filter: TaskFilter): Promise<readonly Task[]> {
    this.#assertOpen();
    return this.#serial.run(async () => {
      const state = await this.#load();
      return Object.freeze(
        filter.completed === undefined
          ? [...state.tasks]
          : state.tasks.filter((task) => task.completed === filter.completed),
      );
    });
  }

  get(rawId: number): Promise<Task> {
    this.#assertOpen();
    const id = validateTaskId(rawId);
    return this.#serial.run(async () => {
      const state = await this.#load();
      const task = state.tasks.find((candidate) => candidate.id === id);
      if (task === undefined) throw new TaskNotFoundError(id);
      return task;
    });
  }

  update(rawId: number, update: UpdateTaskDto): Promise<Task> {
    this.#assertOpen();
    const id = validateTaskId(rawId);
    const title = update.title === undefined ? undefined : validateTitle(update.title);
    if (title === undefined && update.completed === undefined) {
      throw new StorageError("update task", "update must not be empty");
    }
    return this.#serial.run(async () => {
      const state = await this.#load();
      const index = state.tasks.findIndex((task) => task.id === id);
      const current = state.tasks[index];
      if (current === undefined) throw new TaskNotFoundError(id);
      const task = Object.freeze({
        id,
        title: title ?? current.title,
        completed: update.completed ?? current.completed,
      });
      const tasks = [...state.tasks];
      tasks[index] = task;
      await publishAtomically(
        this.#path,
        serializeMarkdownDocument({
          nextId: state.nextId,
          tasks: Object.freeze(tasks),
        }),
      );
      return task;
    });
  }

  delete(rawId: number): Promise<void> {
    this.#assertOpen();
    const id = validateTaskId(rawId);
    return this.#serial.run(async () => {
      const state = await this.#load();
      const tasks = state.tasks.filter((task) => task.id !== id);
      if (tasks.length === state.tasks.length) throw new TaskNotFoundError(id);
      await publishAtomically(
        this.#path,
        serializeMarkdownDocument({ nextId: state.nextId, tasks }),
      );
    });
  }

  async close(): Promise<void> {
    this.#closed = true;
  }
}
