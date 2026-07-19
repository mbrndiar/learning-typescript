import {
  type CapstoneImplementation,
  CapstoneIncompleteError,
} from "../../../shared/harness.ts";
import type {
  ClosableEventLog,
  IncomingEvent,
  LogStorage,
  ParseResult,
  RelayError,
  RelayErrorCode,
  RelayHttpHandler,
  RelayHttpTarget,
  RelayRuntimeAdapter,
  ReplayQuery,
  RuntimeCapabilities,
  RuntimeName,
  StoredEvent,
  Subscriber,
} from "./contracts.ts";

export * from "./contracts.ts";

export const CAPSTONE_IMPLEMENTATION: CapstoneImplementation = "starter";

function incomplete(feature: string): CapstoneIncompleteError {
  return new CapstoneIncompleteError("idiomatic", CAPSTONE_IMPLEMENTATION, feature);
}

export class RelayFailure extends Error {
  readonly code: RelayErrorCode;
  readonly path?: string;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(error: RelayError) {
    super(error.message);
    this.name = "RelayFailure";
    this.code = error.code;
    if (error.path !== undefined) {
      this.path = error.path;
    }
    if (error.details !== undefined) {
      this.details = error.details;
    }
  }

  toRelayError(): RelayError {
    return {
      code: this.code,
      message: this.message,
      ...(this.path === undefined ? {} : { path: this.path }),
      ...(this.details === undefined ? {} : { details: this.details }),
    };
  }
}

export function relayFailure(
  code: RelayErrorCode,
  message: string,
  options: {
    readonly path?: string;
    readonly details?: Readonly<Record<string, unknown>>;
  } = {},
): RelayFailure {
  return new RelayFailure({
    code,
    message,
    ...(options.path === undefined ? {} : { path: options.path }),
    ...(options.details === undefined ? {} : { details: options.details }),
  });
}

export function asRelayFailure(
  error: unknown,
  fallbackCode: RelayErrorCode,
  fallbackMessage: string,
): RelayFailure {
  return error instanceof RelayFailure
    ? error
    : relayFailure(fallbackCode, fallbackMessage);
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted === true) {
    throw relayFailure("cancelled", "operation was cancelled");
  }
}

export function parseEvent(_value: unknown): ParseResult {
  return {
    ok: false,
    error: {
      code: "not_implemented",
      message: "TODO(m1-domain): implement strict event parsing",
      details: { implementation: CAPSTONE_IMPLEMENTATION },
    },
  };
}

export function normalizeReplayQuery(
  _query: ReplayQuery,
): Required<Pick<ReplayQuery, "after" | "limit">> &
  Pick<ReplayQuery, "kind" | "source"> {
  throw incomplete("TODO(m1-domain): normalize replay queries");
}

export function eventMatches(_event: StoredEvent, _query: ReplayQuery): boolean {
  throw incomplete("TODO(m1-domain): filter replay events");
}

export function assertNever(value: never): never {
  throw new Error(`unreachable event variant: ${String(value)}`);
}

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}

export function deferred<T>(): Deferred<T> {
  let resolvePromise: (value: T) => void = () => undefined;
  let rejectPromise: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

export class BoundedAsyncQueue<T> implements AsyncIterable<T> {
  constructor(readonly capacity: number) {}

  get size(): number {
    return 0;
  }

  push(_value: T, _signal?: AbortSignal): Promise<void> {
    return Promise.reject(incomplete("TODO(m2-async): enqueue with backpressure"));
  }

  close(): void {}

  fail(_error: unknown): void {}

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: () =>
        Promise.reject(incomplete("TODO(m2-async): consume the bounded queue")),
    };
  }
}

export class InMemoryEventLog implements ClosableEventLog {
  constructor(readonly capacity = 10_000) {}

  append(_event: IncomingEvent, _signal?: AbortSignal): Promise<StoredEvent> {
    return Promise.reject(incomplete("TODO(m1-domain): append an in-memory event"));
  }

  replay(_query: ReplayQuery, _signal?: AbortSignal): AsyncIterable<StoredEvent> {
    return incompleteIterable("TODO(m1-domain): replay in-memory events");
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}

export function parseVersionedLog(_text: string): readonly StoredEvent[] {
  throw incomplete("TODO(m3-adapter): validate the versioned event log");
}

export class VersionedEventLog implements ClosableEventLog {
  constructor(
    _storage: LogStorage,
    readonly capacity = 10_000,
  ) {}

  append(_event: IncomingEvent, _signal?: AbortSignal): Promise<StoredEvent> {
    return Promise.reject(incomplete("TODO(m3-adapter): append a log record"));
  }

  replay(_query: ReplayQuery, _signal?: AbortSignal): AsyncIterable<StoredEvent> {
    return incompleteIterable("TODO(m3-adapter): replay the versioned log");
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}

export class EventRelay {
  readonly accepting: boolean = false;

  constructor(
    readonly eventLog: ClosableEventLog,
    _subscribers: readonly Subscriber[] = [],
    _queueCapacity = 64,
  ) {}

  stopAccepting(): void {}

  submit(_event: IncomingEvent, _signal?: AbortSignal): Promise<StoredEvent> {
    return Promise.reject(incomplete("TODO(m2-async): relay an event"));
  }

  close(): Promise<void> {
    return this.eventLog.close();
  }
}

export interface NumberedLine {
  readonly number: number;
  readonly text: string;
}

export function decodeNdjsonLines(
  _chunks: AsyncIterable<Uint8Array>,
  _signal?: AbortSignal,
): AsyncIterable<NumberedLine> {
  return incompleteIterable("TODO(m2-async): decode NDJSON input");
}

function incompleteIterable<T>(feature: string): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]: () => ({
      next: () => Promise.reject(incomplete(feature)),
    }),
  };
}

export function createRelayHttpHandler(_relay: RelayHttpTarget): RelayHttpHandler {
  return () => Promise.reject(incomplete("TODO(m4-http): handle a relay HTTP request"));
}

export type RelayCommand =
  | {
      readonly kind: "ingest";
      readonly log: string;
      readonly input: string;
      readonly capacity: number;
    }
  | {
      readonly kind: "replay";
      readonly log: string;
      readonly query: ReplayQuery;
    }
  | {
      readonly kind: "serve";
      readonly log: string;
      readonly options: { readonly host: string; readonly port: number };
      readonly queueCapacity: number;
    };

export function parseRelayCli(_arguments: readonly string[]): RelayCommand {
  throw incomplete("TODO(m2-async): parse relay CLI arguments");
}

export function runRelayCli(
  _arguments: readonly string[],
  _capabilities: RuntimeCapabilities,
): Promise<number> {
  return Promise.reject(incomplete("TODO(m2-async): run the relay CLI"));
}

export function createRuntimeAdapter(
  runtime: RuntimeName,
  _capabilities?: RuntimeCapabilities,
): RelayRuntimeAdapter {
  return {
    runtime,
    implementation: CAPSTONE_IMPLEMENTATION,
    run(_arguments) {
      return Promise.reject(incomplete(`${runtime} relay adapter`));
    },
  };
}
