import type { TaskStorage } from "./storage.ts";
import { normalizeTitle, type Task, validateTaskId } from "./task.ts";

/**
 * The single domain entry point for callers. It applies validation once and
 * delegates persistence to any TaskStorage, so validation cannot be bypassed by
 * choosing a different backend and no backend needs to re-implement the rules.
 */
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
