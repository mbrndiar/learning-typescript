import { DatabaseSync } from "node:sqlite";

export interface Task {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
}

export interface TaskRepository {
  create(title: string): Task;
  list(): readonly Task[];
  close(): void;
}

export function openTaskRepository(): TaskRepository {
  void DatabaseSync;
  throw new Error("TODO: create an in-memory SQLite task repository");
}
