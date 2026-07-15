export interface CreateTask {
  readonly title: string;
}

export function parseCreateTask(value: unknown): CreateTask {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("request body must be an object");
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 1 || keys[0] !== "title") {
    throw new TypeError("request body must contain only title");
  }
  if (typeof record.title !== "string" || record.title.trim() === "") {
    throw new TypeError("title must be a non-empty string");
  }

  return { title: record.title.trim() };
}
