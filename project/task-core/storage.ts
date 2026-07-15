import type { Task } from "./task.ts";

/**
 * Signals a missing task. A single shared error type lets callers branch
 * uniformly (map to HTTP 404, CLI exit code) no matter which backend raised it.
 */
export class TaskNotFoundError extends Error {
  constructor(readonly taskId: number) {
    super(`task ${taskId} was not found`);
    this.name = "TaskNotFoundError";
  }
}

/**
 * The persistence contract consumed by TaskManager. It is defined here, next to
 * its consumer, so backends stay decoupled from the domain and any adapter
 * (file, SQLite, REST, memory) is interchangeable behind these five methods.
 */
export interface TaskStorage {
  list(): Promise<readonly Task[]>;
  add(title: string): Promise<Task>;
  complete(id: number): Promise<Task>;
  remove(id: number): Promise<void>;
}
