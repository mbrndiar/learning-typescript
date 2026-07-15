import type { TaskStorage } from "./storage.ts";
import { normalizeTitle, type Task, validateTaskId } from "./task.ts";

export class TaskManager {
  constructor(private readonly storage: TaskStorage) {}

  list(): Promise<readonly Task[]> {
    return this.storage.list();
  }

  add(title: string): Promise<Task> {
    return this.storage.add(normalizeTitle(title));
  }

  complete(id: number): Promise<Task> {
    return this.storage.complete(validateTaskId(id));
  }

  remove(id: number): Promise<void> {
    return this.storage.remove(validateTaskId(id));
  }
}
