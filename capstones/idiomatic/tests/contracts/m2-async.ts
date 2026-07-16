import {
  BoundedAsyncQueue,
  decodeNdjsonLines,
  deferred,
  EventRelay,
  InMemoryEventLog,
  parseRelayCli,
  relayFailure,
  runRelayCli,
  type RuntimeCapabilities,
  type StoredEvent,
  type Subscriber,
} from "../../solution/core/index.ts";
import { collect, deepEqual, equal, rejects, validMetric } from "./testing.ts";

export async function runM2AsyncContract(): Promise<void> {
  const queue = new BoundedAsyncQueue<number>(2);
  await queue.push(1);
  await queue.push(2);
  let thirdResolved = false;
  const third = queue.push(3).then(() => {
    thirdResolved = true;
  });
  await Promise.resolve();
  equal(thirdResolved, false, "producer must wait while the queue is full");
  const iterator = queue[Symbol.asyncIterator]();
  deepEqual(await iterator.next(), { done: false, value: 1 }, "queue must be FIFO");
  await third;
  queue.close();
  deepEqual(
    [await iterator.next(), await iterator.next(), await iterator.next()],
    [
      { done: false, value: 2 },
      { done: false, value: 3 },
      { done: true, value: undefined },
    ],
    "queue must drain before closing",
  );

  const returnedQueue = new BoundedAsyncQueue<number>(1);
  const abandonedIterator = returnedQueue[Symbol.asyncIterator]();
  const abandonedRead = abandonedIterator.next();
  await abandonedIterator.return?.();
  deepEqual(
    await abandonedRead,
    { done: true, value: undefined },
    "return must resolve a pending queue read",
  );
  await returnedQueue.push(7);
  const replacementIterator = returnedQueue[Symbol.asyncIterator]();
  deepEqual(
    await replacementIterator.next(),
    { done: false, value: 7 },
    "returned consumers must not steal later values",
  );
  returnedQueue.close();

  const gate = deferred<void>();
  const accepted: number[] = [];
  const subscriber: Subscriber = {
    async accept(event) {
      if (event.sequence === 1) {
        await gate.promise;
      }
      accepted.push(event.sequence);
    },
  };
  const relay = new EventRelay(new InMemoryEventLog(), [subscriber], 1);
  const submissions = [
    relay.submit(validMetric("one")),
    relay.submit(validMetric("two")),
    relay.submit(validMetric("three")),
  ];
  await Promise.resolve();
  gate.resolve();
  const stored = await Promise.all(submissions);
  deepEqual(
    stored.map((event) => event.sequence),
    [1, 2, 3],
    "relay must preserve producer order",
  );
  deepEqual(accepted, [1, 2, 3], "subscriber delivery must remain FIFO");
  await relay.close();

  const shutdownGate = deferred<void>();
  const drainingRelay = new EventRelay(new InMemoryEventLog(), [
    { accept: () => shutdownGate.promise },
  ]);
  const drainingSubmission = drainingRelay.submit(validMetric("drain"));
  await Promise.resolve();
  drainingRelay.stopAccepting();
  let shutdownFinished = false;
  const shutdown = drainingRelay.close().then(() => {
    shutdownFinished = true;
  });
  await Promise.resolve();
  equal(
    shutdownFinished,
    false,
    "shutdown must wait for already appended subscriber delivery",
  );
  shutdownGate.resolve();
  await Promise.all([drainingSubmission, shutdown]);

  const failedSubscriber: Subscriber = {
    accept(event: StoredEvent) {
      return event.sequence === 1
        ? Promise.reject(relayFailure("cancelled", "subscriber broke"))
        : Promise.resolve();
    },
  };
  const failingRelay = new EventRelay(new InMemoryEventLog(), [failedSubscriber], 1);
  await rejects(
    () => failingRelay.submit(validMetric("failure")),
    "subscriber_failed",
    "subscriber failure must stop acknowledgement",
  );
  await rejects(
    () => failingRelay.submit(validMetric("later")),
    "subscriber_failed",
    "relay must reject later events after subscriber failure",
  );
  await failingRelay.close();

  const encoded = new TextEncoder().encode('{"id":"café"}\r\n\n{"id":"partial"}');
  const chunks = (async function* () {
    yield encoded.slice(0, 11);
    yield encoded.slice(11, 14);
    yield encoded.slice(14);
  })();
  deepEqual(
    await collect(decodeNdjsonLines(chunks)),
    [
      { number: 1, text: '{"id":"café"}' },
      { number: 2, text: "" },
      { number: 3, text: '{"id":"partial"}' },
    ],
    "NDJSON decoder must preserve physical lines and partial final input",
  );

  let inputCleaned = false;
  const inputController = new AbortController();
  const cancellableInput = (async function* () {
    try {
      yield new TextEncoder().encode("first\n");
      yield new TextEncoder().encode("second\n");
    } finally {
      inputCleaned = true;
    }
  })();
  const decoded = decodeNdjsonLines(cancellableInput, inputController.signal)[
    Symbol.asyncIterator
  ]();
  deepEqual(
    await decoded.next(),
    { value: { number: 1, text: "first" }, done: false },
    "decoder must yield before cancellation",
  );
  inputController.abort();
  await rejects(() => decoded.next(), "cancelled", "decoder must stop when cancelled");
  equal(inputCleaned, true, "cancellation must close the input iterator");

  const cancelled = new AbortController();
  cancelled.abort();
  await rejects(
    () => new BoundedAsyncQueue<number>(1).push(1, cancelled.signal),
    "cancelled",
    "aborted producers must fail deterministically",
  );

  const cliLog = new InMemoryEventLog();
  const stdout: string[] = [];
  const stderr: string[] = [];
  const cliInput = [
    JSON.stringify(validMetric("cli-one")),
    '{"kind":"alert"',
    JSON.stringify({ ...validMetric("cli-invalid"), value: null }),
    JSON.stringify(validMetric("cli-two")),
  ].join("\n");
  const capabilities: RuntimeCapabilities = {
    signal: new AbortController().signal,
    io: {
      stdout: (text) => stdout.push(text),
      stderr: (text) => stderr.push(text),
    },
    openLog: () => ({
      append: (event, signal) => cliLog.append(event, signal),
      replay: (query, signal) => cliLog.replay(query, signal),
      close: () => Promise.resolve(),
    }),
    readInput: async function* () {
      yield new TextEncoder().encode(cliInput);
    },
    serve: () => Promise.reject(new Error("serve is not used by ingest")),
  };
  equal(
    await runRelayCli(
      ["ingest", "--log", "memory", "--input", "-", "--capacity", "10"],
      capabilities,
    ),
    3,
    "mixed NDJSON must use the invalid-record exit",
  );
  equal(stdout.length, 4, "ingest must emit one result per non-empty line");
  equal(stderr.length, 0, "invalid records must not become fatal diagnostics");
  deepEqual(
    (await collect(cliLog.replay({}))).map((event) => event.id),
    ["cli-one", "cli-two"],
    "valid records around invalid input must remain appended",
  );
  await cliLog.close();

  deepEqual(
    parseRelayCli(["ingest", "--log", "events.jsonl"]),
    {
      kind: "ingest",
      log: "events.jsonl",
      input: "-",
      capacity: 10_000,
    },
    "ingest CLI defaults must be stable",
  );
  deepEqual(
    parseRelayCli([
      "replay",
      "--log",
      "events.jsonl",
      "--after",
      "2",
      "--kind",
      "alert",
      "--source",
      "checkout",
      "--limit",
      "5",
    ]),
    {
      kind: "replay",
      log: "events.jsonl",
      query: { after: 2, limit: 5, kind: "alert", source: "checkout" },
    },
    "replay CLI options must parse without positional ambiguity",
  );
  deepEqual(
    parseRelayCli([
      "serve",
      "--log",
      "events.jsonl",
      "--port",
      "9000",
      "--queue-capacity",
      "8",
    ]),
    {
      kind: "serve",
      log: "events.jsonl",
      options: { host: "127.0.0.1", port: 9000 },
      queueCapacity: 8,
    },
    "serve CLI options must parse with bounded defaults",
  );
  for (const arguments_ of [
    [],
    ["ingest"],
    ["ingest", "--log", "x", "--unknown", "y"],
    ["ingest", "--log", "x", "--log", "y"],
    ["replay", "--log", "x", "--limit", "0"],
    ["replay", "--log", "x", "--kind", "other"],
    ["serve", "--log", "x", "--host", "0.0.0.0"],
  ]) {
    let failed = false;
    try {
      parseRelayCli(arguments_);
    } catch {
      failed = true;
    }
    equal(failed, true, `invalid CLI must fail: ${arguments_.join(" ")}`);
  }

  const replayLog = new InMemoryEventLog();
  await replayLog.append(validMetric("replay-one"));
  const replayOutput: string[] = [];
  let servedHealth = 0;
  const runtime: RuntimeCapabilities = {
    signal: new AbortController().signal,
    io: {
      stdout: (text) => replayOutput.push(text),
      stderr: (text) => stderr.push(text),
    },
    openLog: () => ({
      append: (event, signal) => replayLog.append(event, signal),
      replay: (query, signal) => replayLog.replay(query, signal),
      close: () => Promise.resolve(),
    }),
    readInput: () => ({
      [Symbol.asyncIterator]: () => ({
        next: () => Promise.resolve({ done: true, value: undefined }),
      }),
    }),
    async serve(_options, handler) {
      servedHealth = (
        await handler({
          method: "GET",
          url: "/healthz",
          headers: { get: () => null },
          body: null,
        })
      ).status;
    },
  };
  equal(
    await runRelayCli(["replay", "--log", "memory"], runtime),
    0,
    "CLI replay must succeed",
  );
  equal(replayOutput.length, 1, "CLI replay must emit stored events");
  equal(
    await runRelayCli(["serve", "--log", "memory"], runtime),
    0,
    "CLI serve must delegate to the runtime",
  );
  equal(servedHealth, 200, "CLI serve must install the shared HTTP handler");
  equal(
    await runRelayCli(["unknown"], runtime),
    2,
    "CLI usage failures must map to exit 2",
  );
  await replayLog.close();
}
