import assert from "node:assert/strict";
import { Readable, Writable } from "node:stream";
import test from "node:test";

import type { Task } from "../../project/task-core/task.ts";
import { exportTasks, importTasks } from "./solution.ts";

class DelayedCollector extends Writable {
  readonly chunks: Buffer[] = [];

  constructor() {
    super({ highWaterMark: 4 });
  }

  override _write(
    chunk: unknown,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    if (typeof chunk !== "string" && !(chunk instanceof Uint8Array)) {
      callback(new TypeError("expected bytes"));
      return;
    }
    this.chunks.push(
      typeof chunk === "string" ? Buffer.from(chunk, encoding) : Buffer.from(chunk),
    );
    setImmediate(callback);
  }
}

const tasks: readonly Task[] = [
  { id: 1, title: "Read streams", completed: true },
  { id: 2, title: "Handle 🌊 bytes", completed: false },
];

test("exportTasks writes one validated JSON record per line", async () => {
  const destination = new DelayedCollector();
  await exportTasks(tasks, destination);

  assert.equal(
    Buffer.concat(destination.chunks).toString("utf8"),
    `${JSON.stringify(tasks[0])}\n${JSON.stringify(tasks[1])}\n`,
  );
  assert.equal(destination.writableFinished, true);
});

test("importTasks handles byte splits, CRLF, blank lines, and a final line", async () => {
  const jsonl = Buffer.from(
    `${JSON.stringify(tasks[0])}\r\n\n${JSON.stringify(tasks[1])}`,
    "utf8",
  );
  const oneByteChunks = Array.from(jsonl, (byte) => Buffer.from([byte]));

  assert.deepEqual(await importTasks(Readable.from(oneByteChunks)), tasks);
});

test("importTasks reports malformed JSON and invalid tasks by line", async () => {
  await assert.rejects(
    importTasks(Readable.from(['\n{"id":1,\n'])),
    /line 2 is not valid JSON/,
  );
  await assert.rejects(
    importTasks(Readable.from(['{"id":1,"title":"ok","completed":"no"}\n'])),
    /line 1\.completed must be a boolean/,
  );
});

test("importTasks rejects duplicate IDs and oversized pending lines", async () => {
  const duplicate = `${JSON.stringify(tasks[0])}\n${JSON.stringify(tasks[0])}\n`;
  await assert.rejects(
    importTasks(Readable.from([duplicate])),
    /line 2 has duplicate task id 1/,
  );

  await assert.rejects(
    importTasks(Readable.from(['{"title":"too long"}']), { maxLineBytes: 8 }),
    /line 1 exceeds maxLineBytes/,
  );
  await assert.rejects(
    importTasks(Readable.from([]), { maxLineBytes: 0 }),
    /positive integer/,
  );
});

test("exportTasks propagates destination errors", async () => {
  const destination = new Writable({
    write(_chunk, _encoding, callback) {
      callback(new Error("disk full"));
    },
  });

  await assert.rejects(exportTasks(tasks, destination), /disk full/);
});
