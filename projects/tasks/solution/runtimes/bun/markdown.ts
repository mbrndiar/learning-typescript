import { open, readFile, rename, unlink } from "node:fs/promises";
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
  decodeMarkdownBytes,
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

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  return typeof error.code === "string" ? error.code : undefined;
}

async function removeTemporary(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch (error) {
    if (errorCode(error) !== "ENOENT") throw error;
  }
}

export async function publishBunMarkdownAtomically(
  path: string,
  source: string,
  temporaryOverride?: string,
): Promise<void> {
  const parent = parentDirectory(path);
  temporarySequence += 1;
  const temporary =
    temporaryOverride ??
    `${parent}/.${fileName(path)}.${process.pid}.${temporarySequence}.tmp`;
  let handle;
  let created = false;
  let closeAttempted = false;
  try {
    handle = await open(temporary, "wx", 0o600);
    created = true;
    await handle.chmod(0o600);
    await handle.writeFile(source, { encoding: "utf8" });
    await handle.sync();
    closeAttempted = true;
    await handle.close();
    handle = undefined;
    await rename(temporary, path);
    const directory = await open(parent, "r");
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
  } catch (error) {
    let failure = error;
    if (handle !== undefined && !closeAttempted) {
      try {
        await handle.close();
      } catch (closeError) {
        failure = new AggregateError([error, closeError]);
      }
    }
    if (created) {
      try {
        await removeTemporary(temporary);
      } catch (cleanupError) {
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

export class BunMarkdownRepository implements TaskRepository {
  readonly #path: string;
  readonly #serial = new SerialExecutor();
  #closed = false;
  #closePromise: Promise<void> | undefined;

  constructor(path: string) {
    this.#path = path;
  }

  #assertOpen(): void {
    if (this.#closed) throw new LifecycleError("markdown repository is closed");
  }

  async #load(): Promise<MarkdownState> {
    try {
      return parseMarkdownDocument(decodeMarkdownBytes(await readFile(this.#path)));
    } catch (error) {
      if (errorCode(error) === "ENOENT") {
        const state = initialMarkdownState();
        await publishBunMarkdownAtomically(
          this.#path,
          serializeMarkdownDocument(state),
        );
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
      await publishBunMarkdownAtomically(
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
      await publishBunMarkdownAtomically(
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
      await publishBunMarkdownAtomically(
        this.#path,
        serializeMarkdownDocument({ nextId: state.nextId, tasks }),
      );
    });
  }

  close(): Promise<void> {
    if (this.#closePromise === undefined) {
      this.#closed = true;
      this.#closePromise = this.#serial.drain();
    }
    return this.#closePromise;
  }
}
