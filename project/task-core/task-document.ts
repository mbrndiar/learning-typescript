import { parseTask, type Task } from "./task.ts";

// TaskDocument is the on-disk JSON schema shared by every file-based backend.
// An explicit version enables format evolution, and a monotonic nextId
// guarantees identifiers are never reused even after tasks are removed.
export interface TaskDocument {
  readonly version: 1;
  readonly nextId: number;
  readonly tasks: readonly Task[];
}

export const emptyTaskDocument: TaskDocument = {
  version: 1,
  nextId: 1,
  tasks: [],
};

/**
 * Validates untrusted file contents into a trusted TaskDocument. The uniqueness
 * and nextId > max(id) checks reject corrupt files that would otherwise let the
 * store hand out a colliding identifier.
 */
export function parseTaskDocument(value: unknown): TaskDocument {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("task document must be an object");
  }

  const record = value as Record<string, unknown>;
  if (record.version !== 1) {
    throw new TypeError("unsupported task document version");
  }
  if (!Number.isSafeInteger(record.nextId) || (record.nextId as number) <= 0) {
    throw new TypeError("task document nextId must be a positive integer");
  }
  if (!Array.isArray(record.tasks)) {
    throw new TypeError("task document tasks must be an array");
  }

  const tasks = record.tasks.map((task, index) => parseTask(task, `tasks[${index}]`));
  const identifiers = new Set(tasks.map((task) => task.id));
  if (identifiers.size !== tasks.length) {
    throw new TypeError("task identifiers must be unique");
  }
  if (tasks.some((task) => task.id >= (record.nextId as number))) {
    throw new TypeError("nextId must be greater than every task id");
  }

  return {
    version: 1,
    nextId: record.nextId as number,
    tasks,
  };
}

// Serialize with a trailing newline so the file is POSIX-friendly and stable
// under line-based diffing; the exact bytes matter because writes are atomic.
export function serializeTaskDocument(document: TaskDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}
