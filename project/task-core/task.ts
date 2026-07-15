// task-core owns the runtime-neutral domain: the Task shape and the validation
// rules that every backend (file, SQLite, REST) and every runtime (Node, Deno,
// Bun) must agree on. Keeping this module free of I/O is what lets the same
// domain rules run unchanged everywhere.

/** A task is immutable to callers; state changes produce a new Task value. */
export interface Task {
  readonly id: number;
  readonly title: string;
  readonly completed: boolean;
}

/**
 * Normalizes and validates a user-supplied title at the trust boundary.
 * Callers (CLI, HTTP, storage) rely on this single choke point so the same
 * limits (non-blank, <=200 chars, no NUL) hold regardless of the entry path.
 */
export function normalizeTitle(title: string): string {
  const normalized = title.trim();
  if (normalized === "") {
    throw new TypeError("title must not be blank");
  }
  if (normalized.length > 200) {
    throw new RangeError("title must contain at most 200 characters");
  }
  if (normalized.includes("\0")) {
    throw new TypeError("title must not contain NUL characters");
  }
  return normalized;
}

/** Validates an identifier supplied by an untrusted caller (CLI arg, URL). */
export function validateTaskId(id: number): number {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new RangeError("task id must be a positive integer");
  }
  return id;
}

/**
 * Parses an unknown value (parsed JSON, DB row) into a trusted Task. This is
 * the runtime-neutral row/record validator every persistence layer reuses so
 * malformed stored data fails loudly instead of leaking into the domain.
 */
export function parseTask(value: unknown, context = "task"): Task {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${context} must be an object`);
  }

  const record = value as Record<string, unknown>;
  if (!Number.isSafeInteger(record.id) || (record.id as number) <= 0) {
    throw new TypeError(`${context}.id must be a positive integer`);
  }
  if (typeof record.title !== "string") {
    throw new TypeError(`${context}.title must be a string`);
  }
  if (typeof record.completed !== "boolean") {
    throw new TypeError(`${context}.completed must be a boolean`);
  }

  return {
    id: record.id as number,
    title: normalizeTitle(record.title),
    completed: record.completed,
  };
}
