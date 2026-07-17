export interface Task {
  readonly id: number;
  readonly title: string;
  readonly completed: boolean;
}

function normalizeTitle(title: string): string {
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
