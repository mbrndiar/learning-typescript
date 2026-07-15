// Reference solution for the Node runtime exercise. It favors streaming
// boundaries over whole-file buffering so large or slow inputs stay bounded.
import { StringDecoder } from "node:string_decoder";
import { Readable, type Writable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { parseTask, type Task } from "../../project/task-core/task.ts";

export interface ImportOptions {
  readonly maxLineBytes?: number;
}

const DEFAULT_MAX_LINE_BYTES = 64 * 1024;

// Serialization validates as it streams, so the destination never receives a
// record that the shared task core would reject.
async function* serializeTasks(
  tasks: Iterable<Task> | AsyncIterable<Task>,
): AsyncGenerator<Buffer> {
  let position = 0;
  for await (const value of tasks) {
    position += 1;
    const task = parseTask(value, `task ${position}`);
    yield Buffer.from(`${JSON.stringify(task)}\n`, "utf8");
  }
}

// CONTRACT: export compact JSON Lines and resolve only after pipeline has
// handled backpressure, completion, or a writable failure.
export async function exportTasks(
  tasks: Iterable<Task> | AsyncIterable<Task>,
  destination: Writable,
): Promise<void> {
  await pipeline(Readable.from(serializeTasks(tasks)), destination);
}

// CONTRACT: consume a byte stream incrementally, preserve split UTF-8, and
// report boundary errors with physical line numbers.
export async function importTasks(
  source: Readable,
  options: ImportOptions = {},
): Promise<Task[]> {
  const maxLineBytes = options.maxLineBytes ?? DEFAULT_MAX_LINE_BYTES;
  if (!Number.isSafeInteger(maxLineBytes) || maxLineBytes < 1) {
    throw new RangeError("maxLineBytes must be a positive integer");
  }

  // StringDecoder keeps partial UTF-8 code points between chunks; toString()
  // on each chunk would replace split characters with U+FFFD.
  const decoder = new StringDecoder("utf8");
  const tasks: Task[] = [];
  const ids = new Set<number>();
  let pending = "";
  let lineNumber = 0;

  // Physical line numbers advance before blank-line skipping so diagnostics
  // still match the original file.
  const parseLine = (lineWithPossibleCarriageReturn: string): void => {
    lineNumber += 1;
    const line = lineWithPossibleCarriageReturn.endsWith("\r")
      ? lineWithPossibleCarriageReturn.slice(0, -1)
      : lineWithPossibleCarriageReturn;

    if (Buffer.byteLength(line, "utf8") > maxLineBytes) {
      throw new RangeError(`line ${lineNumber} exceeds maxLineBytes`);
    }
    if (line.trim() === "") {
      return;
    }

    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch (error) {
      throw new SyntaxError(`line ${lineNumber} is not valid JSON`, {
        cause: error,
      });
    }

    const task = parseTask(value, `line ${lineNumber}`);
    if (ids.has(task.id)) {
      throw new TypeError(`line ${lineNumber} has duplicate task id ${task.id}`);
    }
    ids.add(task.id);
    tasks.push(task);
  };

  for await (const chunk of source) {
    if (typeof chunk === "string") {
      pending += decoder.write(Buffer.from(chunk, "utf8"));
    } else if (chunk instanceof Uint8Array) {
      pending += decoder.write(Buffer.from(chunk));
    } else {
      throw new TypeError("task input must be a byte stream");
    }

    let newlineIndex = pending.indexOf("\n");
    while (newlineIndex !== -1) {
      parseLine(pending.slice(0, newlineIndex));
      pending = pending.slice(newlineIndex + 1);
      newlineIndex = pending.indexOf("\n");
    }

    // Check the unfinished line after each chunk so a missing newline cannot
    // grow the retained buffer past the configured limit.
    if (Buffer.byteLength(pending, "utf8") > maxLineBytes) {
      throw new RangeError(`line ${lineNumber + 1} exceeds maxLineBytes`);
    }
  }

  pending += decoder.end();
  if (pending !== "") {
    parseLine(pending);
  }

  return tasks;
}
