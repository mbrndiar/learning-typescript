export interface Task {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
}

export function parseTasks(value: unknown): Task[] {
  if (!Array.isArray(value)) {
    throw new TypeError("tasks must be an array");
  }

  return value.map((item, index) => {
    if (typeof item !== "object" || item === null) {
      throw new TypeError(`tasks[${index}] must be an object`);
    }

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

    return {
      id: record.id as number,
      title: record.title.trim(),
      done: record.done,
    };
  });
}
