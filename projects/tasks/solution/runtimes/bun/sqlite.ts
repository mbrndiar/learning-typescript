import { Database } from "bun:sqlite";
import {
  LifecycleError,
  StorageError,
  TaskNotFoundError,
  validateTaskId,
  validateTitle,
  type Task,
  type TaskFilter,
  type TaskRepository,
  type UpdateTaskDto,
} from "../../core/index.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeInteger(value: unknown, field: string): number {
  const integer =
    typeof value === "bigint"
      ? value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER)
        ? Number(value)
        : Number.NaN
      : value;
  if (typeof integer !== "number" || !Number.isSafeInteger(integer)) {
    throw new StorageError("read sqlite", `${field} is not a safe integer`);
  }
  return integer;
}

function taskFromRow(value: unknown): Task {
  if (!isRecord(value)) {
    throw new StorageError("read sqlite", "row is not an object");
  }
  let id: number;
  let title: string;
  try {
    id = validateTaskId(safeInteger(value.id, "id"));
    title = validateTitle(value.title);
  } catch (error) {
    throw new StorageError("read sqlite", "row contains invalid values", error);
  }
  const completed = safeInteger(value.completed, "completed");
  if (completed !== 0 && completed !== 1) {
    throw new StorageError("read sqlite", "completed must be 0 or 1");
  }
  return Object.freeze({ id, title, completed: completed === 1 });
}

function openDatabase(path: string): Database {
  try {
    return new Database(path, {
      create: true,
      strict: true,
      safeIntegers: true,
    });
  } catch (error) {
    throw new StorageError("open sqlite", "could not open database", error);
  }
}

export class BunSqliteRepository implements TaskRepository {
  readonly #database: Database;
  #closed = false;

  constructor(path: string) {
    this.#database = openDatabase(path);
    try {
      this.#initialize();
    } catch (error) {
      try {
        this.#database.close();
      } catch (closeError) {
        throw new StorageError(
          "open sqlite",
          "initialization and close both failed",
          new AggregateError([error, closeError]),
        );
      }
      throw new StorageError("open sqlite", "could not initialize database", error);
    }
  }

  #assertOpen(): void {
    if (this.#closed) throw new LifecycleError("sqlite repository is closed");
  }

  #initialize(): void {
    const row = this.#database.query("PRAGMA user_version").get();
    if (!isRecord(row)) {
      throw new StorageError("open sqlite", "invalid schema version result");
    }
    const version = safeInteger(row.user_version, "schema version");
    if (version === 0) {
      const table = this.#database
        .query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tasks'")
        .get();
      if (table !== null) {
        throw new StorageError(
          "open sqlite",
          "tasks table exists without a schema version",
        );
      }
      this.#database.exec("BEGIN IMMEDIATE");
      try {
        this.#database.exec(`
          CREATE TABLE tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            completed INTEGER NOT NULL CHECK (completed IN (0, 1))
          );
          PRAGMA user_version = 1;
          COMMIT
        `);
      } catch (error) {
        this.#rollback("initialize sqlite", error);
      }
    } else if (version !== 1) {
      throw new StorageError(
        "open sqlite",
        `unsupported schema version ${String(version)}`,
      );
    }
    this.#validateSchema();
  }

  #validateSchema(): void {
    const definition = this.#database
      .query("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'tasks'")
      .get();
    if (
      !isRecord(definition) ||
      typeof definition.sql !== "string" ||
      !/\bAUTOINCREMENT\b/iu.test(definition.sql) ||
      !/\bCHECK\s*\(\s*completed\s+IN\s*\(\s*0\s*,\s*1\s*\)\s*\)/iu.test(definition.sql)
    ) {
      throw new StorageError(
        "open sqlite",
        "tasks schema constraints are incompatible",
      );
    }
    const rows = this.#database.query("PRAGMA table_info(tasks)").all();
    const expected = [
      ["id", "INTEGER", 0, 1],
      ["title", "TEXT", 1, 0],
      ["completed", "INTEGER", 1, 0],
    ] as const;
    if (rows.length !== expected.length) {
      throw new StorageError("open sqlite", "tasks schema has unexpected columns");
    }
    for (let index = 0; index < expected.length; index += 1) {
      const row = rows[index];
      const shape = expected[index];
      if (
        !isRecord(row) ||
        shape === undefined ||
        row.name !== shape[0] ||
        row.type !== shape[1] ||
        safeInteger(row.notnull, "notnull") !== shape[2] ||
        safeInteger(row.pk, "primary key") !== shape[3]
      ) {
        throw new StorageError("open sqlite", "tasks schema is incompatible");
      }
    }
  }

  #rollback(operation: string, original: unknown): never {
    try {
      this.#database.exec("ROLLBACK");
    } catch (rollbackError) {
      throw new StorageError(
        operation,
        "operation and rollback both failed",
        new AggregateError([original, rollbackError]),
      );
    }
    throw new StorageError(operation, "transaction failed", original);
  }

  async create(rawTitle: string): Promise<Task> {
    this.#assertOpen();
    const title = validateTitle(rawTitle);
    this.#database.exec("BEGIN IMMEDIATE");
    try {
      const result = this.#database
        .query("INSERT INTO tasks(title, completed) VALUES (?, 0)")
        .run(title);
      const id = validateTaskId(safeInteger(result.lastInsertRowid, "insert id"));
      const task = taskFromRow(
        this.#database
          .query("SELECT id, title, completed FROM tasks WHERE id = ?")
          .get(id),
      );
      this.#database.exec("COMMIT");
      return task;
    } catch (error) {
      return this.#rollback("create task", error);
    }
  }

  async list(filter: TaskFilter): Promise<readonly Task[]> {
    this.#assertOpen();
    try {
      const rows =
        filter.completed === undefined
          ? this.#database
              .query("SELECT id, title, completed FROM tasks ORDER BY id")
              .all()
          : this.#database
              .query(
                "SELECT id, title, completed FROM tasks WHERE completed = ? ORDER BY id",
              )
              .all(filter.completed ? 1 : 0);
      return Object.freeze(rows.map(taskFromRow));
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError("list tasks", "query failed", error);
    }
  }

  async get(rawId: number): Promise<Task> {
    this.#assertOpen();
    const id = validateTaskId(rawId);
    try {
      const row = this.#database
        .query("SELECT id, title, completed FROM tasks WHERE id = ?")
        .get(id);
      if (row === null) throw new TaskNotFoundError(id);
      return taskFromRow(row);
    } catch (error) {
      if (error instanceof TaskNotFoundError || error instanceof StorageError) {
        throw error;
      }
      throw new StorageError("get task", "query failed", error);
    }
  }

  async update(rawId: number, update: UpdateTaskDto): Promise<Task> {
    this.#assertOpen();
    const id = validateTaskId(rawId);
    const title = update.title === undefined ? undefined : validateTitle(update.title);
    if (title === undefined && update.completed === undefined) {
      throw new StorageError("update task", "update must not be empty");
    }
    this.#database.exec("BEGIN IMMEDIATE");
    try {
      const current = this.#database
        .query("SELECT id, title, completed FROM tasks WHERE id = ?")
        .get(id);
      if (current === null) throw new TaskNotFoundError(id);
      const task = taskFromRow(current);
      this.#database
        .query("UPDATE tasks SET title = ?, completed = ? WHERE id = ?")
        .run(
          title ?? task.title,
          update.completed === undefined
            ? task.completed
              ? 1
              : 0
            : update.completed
              ? 1
              : 0,
          id,
        );
      const updated = taskFromRow(
        this.#database
          .query("SELECT id, title, completed FROM tasks WHERE id = ?")
          .get(id),
      );
      this.#database.exec("COMMIT");
      return updated;
    } catch (error) {
      if (error instanceof TaskNotFoundError) {
        try {
          this.#database.exec("ROLLBACK");
        } catch (rollbackError) {
          throw new StorageError(
            "update task",
            "not-found rollback failed",
            rollbackError,
          );
        }
        throw error;
      }
      return this.#rollback("update task", error);
    }
  }

  async delete(rawId: number): Promise<void> {
    this.#assertOpen();
    const id = validateTaskId(rawId);
    this.#database.exec("BEGIN IMMEDIATE");
    try {
      const result = this.#database.query("DELETE FROM tasks WHERE id = ?").run(id);
      if (safeInteger(result.changes, "changes") === 0) {
        throw new TaskNotFoundError(id);
      }
      this.#database.exec("COMMIT");
    } catch (error) {
      if (error instanceof TaskNotFoundError) {
        try {
          this.#database.exec("ROLLBACK");
        } catch (rollbackError) {
          throw new StorageError(
            "delete task",
            "not-found rollback failed",
            rollbackError,
          );
        }
        throw error;
      }
      this.#rollback("delete task", error);
    }
  }

  async close(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    try {
      this.#database.close();
    } catch (error) {
      throw new LifecycleError("could not close sqlite repository", error);
    }
  }
}
