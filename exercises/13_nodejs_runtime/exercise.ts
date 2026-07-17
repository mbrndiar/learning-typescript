// Starter for the Node runtime exercise. These functions define a streaming
// JSON Lines boundary: validate domain objects, preserve byte correctness, and
// never require the whole file in memory.
import type { Writable } from "node:stream";
import type { Readable } from "node:stream";

import type { Task } from "./task.ts";

export interface ImportOptions {
  readonly maxLineBytes?: number;
}

// CONTRACT: write one validated task per line and let stream backpressure or
// destination errors decide when the promise settles.
export async function exportTasks(
  tasks: Iterable<Task> | AsyncIterable<Task>,
  destination: Writable,
): Promise<void> {
  void tasks;
  void destination;
  throw new Error("TODO: stream validated tasks as JSON Lines");
}

// CONTRACT: parse arbitrary byte chunks into validated tasks, enforcing the
// line-size limit before a single record can grow without bound.
export async function importTasks(
  source: Readable,
  options: ImportOptions = {},
): Promise<Task[]> {
  void source;
  void options;
  throw new Error("TODO: incrementally parse JSON Lines");
}
