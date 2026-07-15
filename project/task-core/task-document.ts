import { parseTask, type Task } from "./task.ts";

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

export function serializeTaskDocument(document: TaskDocument): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}
