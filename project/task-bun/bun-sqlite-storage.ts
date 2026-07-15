import { Database, type Changes } from "bun:sqlite";
import { chmodSync, statSync } from "node:fs";

import { TaskNotFoundError, type TaskStorage } from "../task-core/storage.ts";
import { normalizeTitle, type Task, validateTaskId } from "../task-core/task.ts";

interface TaskRow {
  readonly id: number;
  readonly title: string;
  readonly completed: number;
}

function changedRows(result: Changes): number {
  return Number(result.changes);
}

export class BunSqliteTaskStorage implements TaskStorage {
  private readonly database: Database;

  constructor(path = ":memory:") {
    let mode = 0o600;
    if (path !== ":memory:") {
      try {
        mode = statSync(path).mode & 0o777;
      } catch (error: unknown) {
        if (
          typeof error !== "object" ||
          error === null ||
          !("code" in error) ||
          error.code !== "ENOENT"
        ) {
          throw error;
        }
      }
    }
    this.database = new Database(path, { create: true, strict: true });
    if (path !== ":memory:" && process.platform !== "win32") {
      chmodSync(path, mode);
    }
    this.database.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
        completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1))
      )
    `);
  }

  async list(): Promise<readonly Task[]> {
    const rows = this.database
      .query<TaskRow, []>("SELECT id, title, completed FROM tasks ORDER BY id")
      .all();
    return rows.map((row, index) => this.parseRow(row, `rows[${index}]`));
  }

  async add(title: string): Promise<Task> {
    const result = this.database
      .query<never, [string]>("INSERT INTO tasks (title) VALUES (?1)")
      .run(normalizeTitle(title));
    return this.get(Number(result.lastInsertRowid));
  }

  async complete(id: number): Promise<Task> {
    validateTaskId(id);
    const result = this.database
      .query<never, [number]>("UPDATE tasks SET completed = 1 WHERE id = ?1")
      .run(id);
    if (changedRows(result) === 0) {
      throw new TaskNotFoundError(id);
    }
    return this.get(id);
  }

  async remove(id: number): Promise<void> {
    validateTaskId(id);
    const result = this.database
      .query<never, [number]>("DELETE FROM tasks WHERE id = ?1")
      .run(id);
    if (changedRows(result) === 0) {
      throw new TaskNotFoundError(id);
    }
  }

  close(): void {
    this.database.close();
  }

  private get(id: number): Task {
    const row = this.database
      .query<TaskRow, [number]>("SELECT id, title, completed FROM tasks WHERE id = ?1")
      .get(id);
    if (row === null) {
      throw new TaskNotFoundError(id);
    }
    return this.parseRow(row, "row");
  }

  private parseRow(value: unknown, context: string): Task {
    if (typeof value !== "object" || value === null) {
      throw new TypeError(`${context} must be an object`);
    }
    const row = value as Record<string, unknown>;
    if (
      !Number.isSafeInteger(row.id) ||
      typeof row.title !== "string" ||
      (row.completed !== 0 && row.completed !== 1)
    ) {
      throw new TypeError(`${context} has an invalid SQLite shape`);
    }
    return {
      id: row.id as number,
      title: row.title,
      completed: row.completed === 1,
    };
  }
}
