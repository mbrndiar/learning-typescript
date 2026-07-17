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

function normalizeTitle(title: string): string {
  const normalized = title.trim();
  if (normalized === "") {
    throw new TypeError("title must be non-empty");
  }
  return normalized;
}

function toTask(row: Record<string, unknown>): Task {
  const { id, title, done } = row;
  if (
    typeof id !== "number" ||
    typeof title !== "string" ||
    (done !== 0 && done !== 1)
  ) {
    throw new Error("SQLite returned an invalid task row");
  }
  return { id, title, done: done === 1 };
}

export function openTaskRepository(): TaskRepository {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL CHECK (length(trim(title)) > 0),
      done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1))
    )
  `);

  const insert = database.prepare(`
    INSERT INTO tasks (title) VALUES (?)
    RETURNING id, title, done
  `);
  const selectAll = database.prepare("SELECT id, title, done FROM tasks ORDER BY id");
  let closed = false;

  function ensureOpen(): void {
    if (closed) {
      throw new Error("repository is closed");
    }
  }

  return {
    create(title: string): Task {
      ensureOpen();
      const row = insert.get(normalizeTitle(title));
      if (row === undefined) {
        throw new Error("SQLite did not return the inserted task");
      }
      return toTask(row);
    },
    list(): readonly Task[] {
      ensureOpen();
      return selectAll.all().map(toTask);
    },
    close(): void {
      if (!closed) {
        database.close();
        closed = true;
      }
    },
  };
}
