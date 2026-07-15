import type { Task } from "./task.ts";

export class TaskNotFoundError extends Error {
  constructor(readonly taskId: number) {
    super(`task ${taskId} was not found`);
    this.name = "TaskNotFoundError";
  }
}

export interface TaskStorage {
  list(): Promise<readonly Task[]>;
  add(title: string): Promise<Task>;
  complete(id: number): Promise<Task>;
  remove(id: number): Promise<void>;
}
