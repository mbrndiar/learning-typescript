export {};

interface Task {
  readonly id: number;
  readonly title: string;
  readonly completed: boolean;
}

interface TaskStorage {
  list(): Promise<readonly Task[]>;
  add(title: string): Promise<Task>;
  complete(id: number): Promise<Task>;
  remove(id: number): Promise<void>;
}

class TaskNotFoundError extends Error {
  constructor(readonly taskId: number) {
    super(`task ${taskId} was not found`);
    this.name = "TaskNotFoundError";
  }
}

function normalizeTitle(title: string): string {
  const normalized = title.trim();
  if (normalized === "") {
    throw new TypeError("title must not be blank");
  }
  return normalized;
}

class TaskManager {
  constructor(private readonly storage: TaskStorage) {}

  list(): Promise<readonly Task[]> {
    return this.storage.list();
  }

  add(title: string): Promise<Task> {
    return this.storage.add(normalizeTitle(title));
  }

  complete(id: number): Promise<Task> {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new RangeError("task id must be a positive integer");
    }
    return this.storage.complete(id);
  }
}

// The Task domain is portable because it depends on the TaskStorage contract,
// not on files, SQLite, permissions, or a specific server API.
class PortableMemoryStorage implements TaskStorage {
  readonly #tasks = new Map<number, Task>();
  #nextId = 1;

  async list(): Promise<readonly Task[]> {
    // Return copies so callers cannot mutate storage state behind the
    // adapter. Real file and database adapters must preserve the same boundary.
    return [...this.#tasks.values()].map((task) => ({ ...task }));
  }

  async add(title: string): Promise<Task> {
    // Normalization belongs to the domain contract, not to any one runtime's
    // persistence mechanism.
    const task = {
      id: this.#nextId,
      title: normalizeTitle(title),
      completed: false,
    };
    this.#nextId += 1;
    this.#tasks.set(task.id, task);
    return { ...task };
  }

  async complete(id: number): Promise<Task> {
    const task = this.#tasks.get(id);
    if (task === undefined) {
      // Preserve the shared error type so callers do not need adapter-specific
      // missing-task handling.
      throw new TaskNotFoundError(id);
    }
    const completed = { ...task, completed: true };
    this.#tasks.set(id, completed);
    return { ...completed };
  }

  async remove(id: number): Promise<void> {
    if (!this.#tasks.delete(id)) {
      throw new TaskNotFoundError(id);
    }
  }
}

// The manager can run unchanged because runtime-specific authority has already
// been pushed down into the storage adapter.
const manager = new TaskManager(new PortableMemoryStorage());
const created = await manager.add("Run one domain everywhere");
await manager.complete(created.id);

console.log({
  tasks: await manager.list(),
  url: new URL("/tasks", "http://127.0.0.1:8080").href,
  abortSignalAvailable: typeof AbortController === "function",
});
