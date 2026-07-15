import { TaskManager } from "../../project/task-core/manager.ts";
import {
  TaskNotFoundError,
  type TaskStorage,
} from "../../project/task-core/storage.ts";
import { normalizeTitle, type Task } from "../../project/task-core/task.ts";

class PortableMemoryStorage implements TaskStorage {
  readonly #tasks = new Map<number, Task>();
  #nextId = 1;

  async list(): Promise<readonly Task[]> {
    return [...this.#tasks.values()].map((task) => ({ ...task }));
  }

  async add(title: string): Promise<Task> {
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

const manager = new TaskManager(new PortableMemoryStorage());
const created = await manager.add("Run one domain everywhere");
await manager.complete(created.id);

console.log({
  tasks: await manager.list(),
  url: new URL("/tasks", "http://127.0.0.1:8080").href,
  abortSignalAvailable: typeof AbortController === "function",
});
