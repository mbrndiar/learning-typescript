import { Database } from "jsr:@db/sqlite@0.13.0";
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
    return new Database(path, { int64: true });
  } catch (error) {
    throw new StorageError("open sqlite", "could not open database", error);
  }
}

export class DenoSqliteRepository implements TaskRepository {
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

  #statement<T>(
    sql: string,
    operation: (statement: ReturnType<Database["prepare"]>) => T,
  ): T {
    const statement = this.#database.prepare(sql);
    let outcome:
      | { readonly ok: true; readonly value: T }
      | {
          readonly ok: false;
          readonly error: unknown;
        };
    try {
      outcome = { ok: true, value: operation(statement) };
    } catch (error) {
      outcome = { ok: false, error };
    }
    try {
      statement.finalize();
    } catch (finalizeError) {
      if (!outcome.ok) {
        throw new StorageError(
          "finalize sqlite statement",
          "operation and finalization both failed",
          new AggregateError([outcome.error, finalizeError]),
        );
      }
      throw new StorageError(
        "finalize sqlite statement",
        "statement finalization failed",
        finalizeError,
      );
    }
    if (!outcome.ok) throw outcome.error;
    return outcome.value;
  }

  #initialize(): void {
    const row = this.#statement("PRAGMA user_version", (statement) => statement.get());
    if (!isRecord(row)) {
      throw new StorageError("open sqlite", "invalid schema version result");
    }
    const version = safeInteger(row.user_version, "schema version");
    if (version === 0) {
      const table = this.#statement(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tasks'",
        (statement) => statement.get(),
      );
      if (table !== undefined) {
        throw new StorageError(
          "open sqlite",
          "tasks table exists without a schema version",
        );
      }
      try {
        this.#database
          .transaction(() => {
            this.#database.exec(`
            CREATE TABLE tasks (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              title TEXT NOT NULL,
              completed INTEGER NOT NULL CHECK (completed IN (0, 1))
            )
          `);
            this.#database.exec("PRAGMA user_version = 1");
          })
          .immediate();
      } catch (error) {
        throw new StorageError("initialize sqlite", "transaction failed", error);
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
    const definition = this.#statement(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'tasks'",
      (statement) => statement.get(),
    );
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
    const rows = this.#statement("PRAGMA table_info(tasks)", (statement) =>
      statement.all(),
    );
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

  async create(rawTitle: string): Promise<Task> {
    this.#assertOpen();
    const title = validateTitle(rawTitle);
    try {
      return this.#database
        .transaction(() => {
          this.#statement(
            "INSERT INTO tasks(title, completed) VALUES (?, 0)",
            (statement) => statement.run(title),
          );
          const id = validateTaskId(
            safeInteger(this.#database.lastInsertRowId, "insert id"),
          );
          return taskFromRow(
            this.#statement(
              "SELECT id, title, completed FROM tasks WHERE id = ?",
              (statement) => statement.get(id),
            ),
          );
        })
        .immediate();
    } catch (error) {
      throw new StorageError("create task", "transaction failed", error);
    }
  }

  async list(filter: TaskFilter): Promise<readonly Task[]> {
    this.#assertOpen();
    try {
      const rows =
        filter.completed === undefined
          ? this.#statement(
              "SELECT id, title, completed FROM tasks ORDER BY id",
              (statement) => statement.all(),
            )
          : this.#statement(
              "SELECT id, title, completed FROM tasks WHERE completed = ? ORDER BY id",
              (statement) => statement.all(filter.completed ? 1 : 0),
            );
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
      const row = this.#statement(
        "SELECT id, title, completed FROM tasks WHERE id = ?",
        (statement) => statement.get(id),
      );
      if (row === undefined) throw new TaskNotFoundError(id);
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
    try {
      return this.#database
        .transaction(() => {
          const current = this.#statement(
            "SELECT id, title, completed FROM tasks WHERE id = ?",
            (statement) => statement.get(id),
          );
          if (current === undefined) throw new TaskNotFoundError(id);
          const task = taskFromRow(current);
          this.#statement(
            "UPDATE tasks SET title = ?, completed = ? WHERE id = ?",
            (statement) =>
              statement.run(
                title ?? task.title,
                update.completed === undefined
                  ? task.completed
                    ? 1
                    : 0
                  : update.completed
                    ? 1
                    : 0,
                id,
              ),
          );
          return taskFromRow(
            this.#statement(
              "SELECT id, title, completed FROM tasks WHERE id = ?",
              (statement) => statement.get(id),
            ),
          );
        })
        .immediate();
    } catch (error) {
      if (error instanceof TaskNotFoundError) throw error;
      throw new StorageError("update task", "transaction failed", error);
    }
  }

  async delete(rawId: number): Promise<void> {
    this.#assertOpen();
    const id = validateTaskId(rawId);
    try {
      this.#database
        .transaction(() => {
          const changes = this.#statement(
            "DELETE FROM tasks WHERE id = ?",
            (statement) => statement.run(id),
          );
          if (changes === 0) throw new TaskNotFoundError(id);
        })
        .immediate();
    } catch (error) {
      if (error instanceof TaskNotFoundError) throw error;
      throw new StorageError("delete task", "transaction failed", error);
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
