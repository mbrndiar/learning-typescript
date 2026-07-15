import { TaskNotFoundError, type TaskStorage } from "../task-manager/storage.ts";
import { normalizeTitle, type Task } from "../task-manager/task.ts";

export class MemoryTaskStorage implements TaskStorage {
  private readonly tasks = new Map<number, Task>();
  private nextId = 1;

  async list(): Promise<readonly Task[]> {
    return [...this.tasks.values()].map((task) => ({ ...task }));
  }

  async add(title: string): Promise<Task> {
    const task: Task = {
      id: this.nextId,
      title: normalizeTitle(title),
      completed: false,
    };
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
