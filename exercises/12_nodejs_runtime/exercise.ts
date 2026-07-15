import type { Writable } from "node:stream";
import type { Readable } from "node:stream";

import type { Task } from "../../project/task-core/task.ts";

export interface ImportOptions {
  readonly maxLineBytes?: number;
}

export async function exportTasks(
  tasks: Iterable<Task> | AsyncIterable<Task>,
  destination: Writable,
): Promise<void> {
  void tasks;
  void destination;
  throw new Error("TODO: stream validated tasks as JSON Lines");
}

export async function importTasks(
  source: Readable,
  options: ImportOptions = {},
): Promise<Task[]> {
  void source;
  void options;
  throw new Error("TODO: incrementally parse JSON Lines");
}
