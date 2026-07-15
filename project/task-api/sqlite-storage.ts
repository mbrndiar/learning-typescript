import { DatabaseSync, type StatementResultingChanges } from "node:sqlite";

import { TaskNotFoundError, type TaskStorage } from "../task-core/storage.ts";
import { normalizeTitle, type Task, validateTaskId } from "../task-core/task.ts";

function changedRows(result: StatementResultingChanges): number {
  return Number(result.changes);
}

export class SqliteTaskStorage implements TaskStorage {
  private readonly database: DatabaseSync;

  constructor(path: string | Buffer | URL = ":memory:") {
    this.database = new DatabaseSync(path);
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
        completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1))
      )
    `);
  }

  async list(): Promise<readonly Task[]> {
    const rows = this.database
      .prepare("SELECT id, title, completed FROM tasks ORDER BY id")
      .all();
    return rows.map((row, index) => this.parseRow(row, `rows[${index}]`));
  }

  async add(title: string): Promise<Task> {
    const normalized = normalizeTitle(title);
    const result = this.database
      .prepare("INSERT INTO tasks (title) VALUES (?)")
      .run(normalized);
    return this.get(Number(result.lastInsertRowid));
  }

  async complete(id: number): Promise<Task> {
    validateTaskId(id);
    const result = this.database
      .prepare("UPDATE tasks SET completed = 1 WHERE id = ?")
      .run(id);
    if (changedRows(result) === 0) {
      throw new TaskNotFoundError(id);
    }
    return this.get(id);
  }

  async remove(id: number): Promise<void> {
    validateTaskId(id);
    const result = this.database.prepare("DELETE FROM tasks WHERE id = ?").run(id);
    if (changedRows(result) === 0) {
      throw new TaskNotFoundError(id);
    }
  }

  close(): void {
    this.database.close();
  }

  private get(id: number): Task {
    const row = this.database
      .prepare("SELECT id, title, completed FROM tasks WHERE id = ?")
      .get(id);
    if (row === undefined) {
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
