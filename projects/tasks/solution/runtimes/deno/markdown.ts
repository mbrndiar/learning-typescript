import {
  LifecycleError,
  StorageError,
  type Task,
  type TaskFilter,
  TaskNotFoundError,
  type TaskRepository,
  type UpdateTaskDto,
  validateTaskId,
  validateTitle,
} from "../../core/index.ts";
import {
  initialMarkdownState,
  type MarkdownState,
  parseMarkdownDocument,
  SerialExecutor,
  serializeMarkdownDocument,
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

async function writeAll(file: Deno.FsFile, bytes: Uint8Array): Promise<void> {
  let offset = 0;
  while (offset < bytes.byteLength) {
    offset += await file.write(bytes.subarray(offset));
  }
}

async function publishAtomically(path: string, source: string): Promise<void> {
  const parent = parentDirectory(path);
  temporarySequence += 1;
  const temporary = `${parent}/.${fileName(path)}.${Deno.pid}.${temporarySequence}.tmp`;
  let file: Deno.FsFile | undefined;
  let closeAttempted = false;
  try {
    file = await Deno.open(temporary, {
      createNew: true,
      write: true,
      mode: 0o600,
    });
    await writeAll(file, new TextEncoder().encode(source));
    await file.sync();
    closeAttempted = true;
    file.close();
    file = undefined;
    await Deno.rename(temporary, path);
    const directory = await Deno.open(parent, { read: true });
    try {
      await directory.sync();
    } finally {
      directory.close();
    }
  } catch (error) {
    let failure = error;
    if (file !== undefined && !closeAttempted) {
      closeAttempted = true;
      try {
        file.close();
      } catch (closeError) {
        failure = new AggregateError([error, closeError]);
      }
    }
    try {
      await Deno.remove(temporary);
    } catch (cleanupError) {
      if (!(cleanupError instanceof Deno.errors.NotFound)) {
        throw new StorageError(
          "write markdown",
          "write and cleanup both failed",
          new AggregateError([failure, cleanupError]),
        );
      }
    }
    throw new StorageError("write markdown", "atomic publication failed", failure);
  }
}

export class DenoMarkdownRepository implements TaskRepository {
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
      return parseMarkdownDocument(await Deno.readTextFile(this.#path));
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        const state = initialMarkdownState();
        await publishAtomically(this.#path, serializeMarkdownDocument(state));
        return state;
      }
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
