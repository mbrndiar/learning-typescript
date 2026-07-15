export interface Task {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
}

// CONTRACT: validate untrusted JSON before returning Task objects the rest of
// the program may rely on.
export function parseTasks(value: unknown): Task[] {
  // The outer container is part of the contract; an object with numeric keys
  // is not the same boundary shape as a JSON array.
  if (!Array.isArray(value)) {
    throw new TypeError("tasks must be an array");
  }

  return value.map((item, index) => {
    // JavaScript reports null as an object, so reject it before property
    // checks. The index makes boundary errors actionable for callers.
    if (typeof item !== "object" || item === null) {
      throw new TypeError(`tasks[${index}] must be an object`);
    }

    // Record allows field inspection while each field remains unknown until a
    // guard proves its type and value constraints.
    const record = item as Record<string, unknown>;
    if (!Number.isInteger(record.id) || (record.id as number) <= 0) {
      throw new TypeError(`tasks[${index}].id must be a positive integer`);
    }
    if (typeof record.title !== "string" || record.title.trim() === "") {
      throw new TypeError(`tasks[${index}].title must be non-empty`);
    }
    if (typeof record.done !== "boolean") {
      throw new TypeError(`tasks[${index}].done must be a boolean`);
    }

    // Trimming here centralizes normalization at the input boundary.
    return {
      id: record.id as number,
      title: record.title.trim(),
      done: record.done,
    };
  });
}
