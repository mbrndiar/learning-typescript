import {
  StorageError,
  type Task,
  validateTaskId,
  validateTitle,
} from "../core/index.ts";

export interface MarkdownState {
  readonly nextId: number;
  readonly tasks: readonly Task[];
}

const HEADER = "# Tasks";
const METADATA = /^<!-- rest-task-api:v([0-9]+) next-id=([0-9]+) -->$/u;
const ROW = /^- \[([ x])\] ([0-9]+): (.*)$/u;

export function initialMarkdownState(): MarkdownState {
  return Object.freeze({ nextId: 1, tasks: Object.freeze([]) });
}

export function parseMarkdownDocument(source: string): MarkdownState {
  if (!source.endsWith("\n")) {
    throw new StorageError("parse markdown", "document must end with one newline");
  }
  const lines = source.slice(0, -1).split("\n");
  if (lines.length < 3) {
    throw new StorageError("parse markdown", "document is incomplete");
  }
  const metadata = METADATA.exec(lines[0] ?? "");
  if (metadata === null || lines[1] !== HEADER || lines[2] !== "") {
    throw new StorageError("parse markdown", "invalid metadata or heading");
  }
  const versionText = metadata[1];
  const nextIdText = metadata[2];
  if (versionText !== "1" || nextIdText === undefined) {
    throw new StorageError("parse markdown", "unsupported schema version");
  }
  let nextId: number;
  try {
    nextId = validateTaskId(nextIdText);
  } catch (error) {
    throw new StorageError("parse markdown", "invalid next-id", error);
  }
  if (String(nextId) !== nextIdText) {
    throw new StorageError("parse markdown", "next-id is not canonical");
  }
  const tasks: Task[] = [];
  let previousId = 0;
  for (const line of lines.slice(3)) {
    const row = ROW.exec(line);
    if (row === null) {
      throw new StorageError("parse markdown", "malformed checklist row");
    }
    const marker = row[1];
    const idText = row[2];
    const titleText = row[3];
    if (idText === undefined || titleText === undefined) {
      throw new StorageError("parse markdown", "malformed checklist row");
    }
    let id: number;
    let title: string;
    try {
      id = validateTaskId(idText);
      title = validateTitle(titleText);
    } catch (error) {
      throw new StorageError("parse markdown", "invalid checklist row", error);
    }
    if (String(id) !== idText) {
      throw new StorageError("parse markdown", "task id is not canonical");
    }
    if (title !== titleText) {
      throw new StorageError("parse markdown", "task title is not canonical");
    }
    if (id <= previousId) {
      throw new StorageError(
        "parse markdown",
        "task ids must be unique and increasing",
      );
    }
    previousId = id;
    tasks.push(Object.freeze({ id, title, completed: marker === "x" }));
  }
  if (nextId <= previousId) {
    throw new StorageError("parse markdown", "next-id must exceed every task id");
  }
  return Object.freeze({ nextId, tasks: Object.freeze(tasks) });
}

export function serializeMarkdownDocument(state: MarkdownState): string {
  const lines = [
    `<!-- rest-task-api:v1 next-id=${state.nextId} -->`,
    HEADER,
    "",
    ...state.tasks.map(
      (task) => `- [${task.completed ? "x" : " "}] ${task.id}: ${task.title}`,
    ),
  ];
  return `${lines.join("\n")}\n`;
}

export class SerialExecutor {
  #tail: Promise<void> = Promise.resolve();

  run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.#tail.then(operation, operation);
    this.#tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
