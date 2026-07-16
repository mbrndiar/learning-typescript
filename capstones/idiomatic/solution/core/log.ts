import type {
  ClosableEventLog,
  IncomingEvent,
  LogStorage,
  ReplayQuery,
  StoredEvent,
} from "./contracts.ts";
import { normalizeReplayQuery, parseEvent } from "./domain.ts";
import {
  asRelayFailure,
  RelayFailure,
  relayFailure,
  throwIfAborted,
} from "./errors.ts";

const header = '{"record":"header","schemaVersion":1}\n';

function own(value: object, key: string): unknown {
  return Object.hasOwn(value, key) ? Reflect.get(value, key) : undefined;
}

function exactKeys(value: object, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function sameJsonValue(left: unknown, right: unknown): boolean {
  if (
    typeof left !== "object" ||
    left === null ||
    typeof right !== "object" ||
    right === null
  ) {
    return Object.is(left, right);
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
      return false;
    }
    return left.every((value, index) => sameJsonValue(value, right[index]));
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] && sameJsonValue(own(left, key), own(right, key)),
    )
  );
}

function corrupt(message: string): never {
  throw relayFailure("log_corrupt", message);
}

export function parseVersionedLog(text: string): readonly StoredEvent[] {
  if (text.length === 0 || !text.endsWith("\n")) {
    return corrupt("log must contain complete newline-terminated records");
  }
  const lines = text.slice(0, -1).split("\n");
  if (lines.length < 1 || lines.some((line) => line.trim().length === 0)) {
    return corrupt("log contains a blank physical line");
  }

  let first: unknown;
  try {
    first = JSON.parse(lines[0] ?? "") as unknown;
  } catch {
    return corrupt("log header is malformed JSON");
  }
  if (typeof first !== "object" || first === null || Array.isArray(first)) {
    return corrupt("log header must be an object");
  }
  if (own(first, "record") !== "header") {
    return corrupt("log must start with a header record");
  }
  if (!exactKeys(first, ["record", "schemaVersion"])) {
    return corrupt("log header has an invalid shape");
  }
  if (own(first, "schemaVersion") !== 1) {
    throw relayFailure(
      "unsupported_log_version",
      "log schema version is not supported",
    );
  }

  const events: StoredEvent[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    let record: unknown;
    try {
      record = JSON.parse(lines[index] ?? "") as unknown;
    } catch {
      return corrupt(`log record ${index + 1} is malformed JSON`);
    }
    if (typeof record !== "object" || record === null || Array.isArray(record)) {
      return corrupt(`log record ${index + 1} must be an object`);
    }
    if (
      own(record, "record") !== "event" ||
      !exactKeys(record, ["record", "sequence", "event"])
    ) {
      return corrupt(`log record ${index + 1} has an invalid shape`);
    }
    const sequence = own(record, "sequence");
    const expectedSequence = index;
    if (
      typeof sequence !== "number" ||
      !Number.isSafeInteger(sequence) ||
      sequence !== expectedSequence
    ) {
      return corrupt(`log record ${index + 1} has a non-contiguous sequence`);
    }
    const parsed = parseEvent(own(record, "event"));
    if (!parsed.ok) {
      return corrupt(`log record ${index + 1} contains an invalid event`);
    }
    if (!sameJsonValue(own(record, "event"), parsed.event)) {
      return corrupt(`log record ${index + 1} contains a non-normalized event`);
    }
    events.push({ ...parsed.event, sequence });
  }
  return events;
}

export class InMemoryEventLog implements ClosableEventLog {
  private readonly events: StoredEvent[] = [];
  private operation: Promise<void> = Promise.resolve();
  private closed = false;

  constructor(readonly capacity = 10_000) {
    validateCapacity(capacity);
  }

  append(event: IncomingEvent, signal?: AbortSignal): Promise<StoredEvent> {
    return this.exclusive(() => {
      throwIfAborted(signal);
      if (this.closed) {
        throw relayFailure("log_io", "event log is closed");
      }
      const parsed = parseEvent(event);
      if (!parsed.ok) {
        throw new RelayFailure(parsed.error);
      }
      if (this.events.length >= this.capacity) {
        throw relayFailure("log_full", "event log capacity has been reached");
      }
      const stored = { ...parsed.event, sequence: this.events.length + 1 };
      this.events.push(stored);
      return stored;
    });
  }

  async *replay(query: ReplayQuery, signal?: AbortSignal): AsyncIterable<StoredEvent> {
    const normalized = normalizeReplayQuery(query);
    const snapshot = await this.exclusive(() => {
      throwIfAborted(signal);
      if (this.closed) {
        throw relayFailure("log_io", "event log is closed");
      }
      return [...this.events];
    });
    let emitted = 0;
    for (const event of snapshot) {
      throwIfAborted(signal);
      if (
        event.sequence > normalized.after &&
        (normalized.kind === undefined || event.kind === normalized.kind) &&
        (normalized.source === undefined || event.source === normalized.source)
      ) {
        yield { ...event };
        emitted += 1;
        if (emitted >= normalized.limit) {
          return;
        }
      }
    }
  }

  async close(): Promise<void> {
    await this.exclusive(() => {
      this.closed = true;
    });
  }

  private exclusive<T>(operation: () => T | Promise<T>): Promise<T> {
    const result = this.operation.then(operation, operation);
    this.operation = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

function validateCapacity(capacity: number): void {
  if (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 100_000) {
    throw relayFailure("invalid_cli", "capacity must be an integer from 1 to 100000");
  }
}

export class VersionedEventLog implements ClosableEventLog {
  private operation: Promise<void> = Promise.resolve();
  private events: readonly StoredEvent[] | undefined;
  private closed = false;

  constructor(
    private readonly storage: LogStorage,
    readonly capacity = 10_000,
  ) {
    validateCapacity(capacity);
  }

  append(event: IncomingEvent, signal?: AbortSignal): Promise<StoredEvent> {
    return this.exclusive(async () => {
      throwIfAborted(signal);
      this.ensureOpen();
      const events = await this.reload();
      const parsed = parseEvent(event);
      if (!parsed.ok) {
        throw new RelayFailure(parsed.error);
      }
      if (events.length >= this.capacity) {
        throw relayFailure("log_full", "event log capacity has been reached");
      }
      const normalized = parsed.event;
      const stored: StoredEvent = { ...normalized, sequence: events.length + 1 };
      const record = `${JSON.stringify({
        record: "event",
        sequence: stored.sequence,
        event: normalized,
      })}\n`;
      try {
        await this.storage.appendText(record);
      } catch (error: unknown) {
        throw asRelayFailure(error, "log_io", "unable to append event log");
      }
      this.events = [...events, stored];
      return stored;
    });
  }

  async *replay(query: ReplayQuery, signal?: AbortSignal): AsyncIterable<StoredEvent> {
    const normalized = normalizeReplayQuery(query);
    const snapshot = await this.exclusive(() => {
      throwIfAborted(signal);
      this.ensureOpen();
      return this.reload();
    });
    let emitted = 0;
    for (const event of snapshot) {
      throwIfAborted(signal);
      if (
        event.sequence > normalized.after &&
        (normalized.kind === undefined || event.kind === normalized.kind) &&
        (normalized.source === undefined || event.source === normalized.source)
      ) {
        yield { ...event };
        emitted += 1;
        if (emitted >= normalized.limit) {
          return;
        }
      }
    }
  }

  async close(): Promise<void> {
    await this.exclusive(async () => {
      if (this.closed) {
        return;
      }
      this.closed = true;
      try {
        await this.storage.close();
      } catch (error: unknown) {
        throw asRelayFailure(error, "log_io", "unable to close event log");
      }
    });
  }

  private ensureOpen(): void {
    if (this.closed) {
      throw relayFailure("log_io", "event log is closed");
    }
  }

  private async reload(): Promise<readonly StoredEvent[]> {
    let text: string | undefined;
    try {
      text = await this.storage.readText();
    } catch (error: unknown) {
      throw asRelayFailure(error, "log_io", "unable to read event log");
    }
    if (text === undefined) {
      if (this.events !== undefined) {
        throw relayFailure("log_io", "event log disappeared while open");
      }
      try {
        await this.storage.createText(header);
      } catch (error: unknown) {
        throw asRelayFailure(error, "log_io", "unable to create event log");
      }
      this.events = [];
      return this.events;
    }
    const events = parseVersionedLog(text);
    this.events = events;
    return events;
  }

  private exclusive<T>(operation: () => T | Promise<T>): Promise<T> {
    const result = this.operation.then(operation, operation);
    this.operation = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
