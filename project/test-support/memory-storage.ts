import { TaskNotFoundError, type TaskStorage } from "../task-core/storage.ts";
import { normalizeTitle, type Task } from "../task-core/task.ts";

// A dependency-free reference backend used by tests. It has no persistence or
// runtime authority, so it isolates domain behavior from I/O and serves as the
// simplest example of the TaskStorage contract.
export class MemoryTaskStorage implements TaskStorage {
  private readonly tasks = new Map<number, Task>();
  private nextId = 1;

  async list(): Promise<readonly Task[]> {
    // Hand out copies so callers cannot mutate stored state; real adapters
    // must uphold the same boundary.
    return [...this.tasks.values()].map((task) => ({ ...task }));
  }

  async add(title: string): Promise<Task> {
    const task: Task = {
      id: this.nextId,
      title: normalizeTitle(title),
      completed: false,
    };
    // nextId only ever increases so removed ids are never reused.
    this.nextId += 1;
    this.tasks.set(task.id, task);
    return { ...task };
  }

  async complete(id: number): Promise<Task> {
    const task = this.tasks.get(id);
    if (task === undefined) {
      throw new TaskNotFoundError(id);
    }
    const completed = { ...task, completed: true };
    this.tasks.set(id, completed);
    return { ...completed };
  }

  async remove(id: number): Promise<void> {
    if (!this.tasks.delete(id)) {
      throw new TaskNotFoundError(id);
    }
  }
}
