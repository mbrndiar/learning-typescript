import assert from "node:assert/strict";
import { EventEmitter, once } from "node:events";
import { Readable, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Worker } from "node:worker_threads";

class SlowCollector extends Writable {
  readonly chunks: Buffer[] = [];
  drainCount = 0;

  constructor() {
    super({ highWaterMark: 8 });
    this.on("drain", () => {
      this.drainCount += 1;
    });
  }

  override _write(
    chunk: unknown,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    if (typeof chunk !== "string" && !(chunk instanceof Uint8Array)) {
      callback(new TypeError("expected a byte chunk"));
      return;
    }

    this.chunks.push(
      typeof chunk === "string" ? Buffer.from(chunk, encoding) : Buffer.from(chunk),
    );
    setImmediate(callback);
  }
}

const text = "Node 🌊";
const encoded = Buffer.from(text, "utf8");
assert.equal(text.length, 7);
assert.equal(encoded.byteLength, 9);
assert.equal(
  Buffer.concat([encoded.subarray(0, 5), encoded.subarray(5)]).toString(),
  text,
);

const records = Array.from({ length: 6 }, (_, index) =>
  Buffer.from(`${JSON.stringify({ id: index + 1, title: `task-${index + 1}` })}\n`),
);
const collector = new SlowCollector();
await pipeline(Readable.from(records), collector);

assert.equal(
  Buffer.concat(collector.chunks).toString("utf8"),
  Buffer.concat(records).toString(),
);
assert.ok(collector.drainCount > 0);
console.log(`pipeline preserved ${records.length} records across backpressure`);

const emitter = new EventEmitter();
const eventOrder: string[] = [];
emitter.on("task", () => eventOrder.push("first"));
emitter.on("task", () => eventOrder.push("second"));
emitter.on("error", (error: Error) => eventOrder.push(`handled:${error.message}`));
emitter.emit("task");
emitter.emit("error", new Error("expected"));
assert.deepEqual(eventOrder, ["first", "second", "handled:expected"]);

const worker = new Worker(
  `
    const { parentPort, workerData } = require("node:worker_threads");
    const total = workerData.reduce((sum, value) => sum + value * value, 0);
    parentPort.postMessage(total);
  `,
  {
    eval: true,
    workerData: [1, 2, 3, 4],
  },
);
const workerExit = once(worker, "exit");
const [workerTotal] = await once(worker, "message");
const [workerExitCode] = await workerExit;

assert.equal(workerTotal, 30);
assert.equal(workerExitCode, 0);
console.log({ eventOrder, workerTotal, workerExitCode });
