import type { CapstoneImplementation } from "../../../shared/harness.ts";

export type RuntimeName = "node" | "deno" | "bun";

export interface MetricEvent {
  readonly kind: "metric";
  readonly id: string;
  readonly source: string;
  readonly observedAt: string;
  readonly name: string;
  readonly value: number;
  readonly tags?: Readonly<Record<string, string>>;
}

export interface AlertEvent {
  readonly kind: "alert";
  readonly id: string;
  readonly source: string;
  readonly observedAt: string;
  readonly code: string;
  readonly severity: "info" | "warning" | "error";
  readonly message: string;
}

export type IncomingEvent = MetricEvent | AlertEvent;
export type StoredEvent = IncomingEvent & { readonly sequence: number };

export type RelayErrorCode =
  | "invalid_event"
  | "invalid_json"
  | "body_too_large"
  | "invalid_query"
  | "invalid_cli"
  | "log_corrupt"
  | "unsupported_log_version"
  | "log_full"
  | "log_io"
  | "subscriber_failed"
  | "cancelled"
  | "shutting_down"
  | "not_implemented";

export interface RelayError {
  readonly code: RelayErrorCode;
  readonly message: string;
  readonly path?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export type ParseResult =
  | { readonly ok: true; readonly event: IncomingEvent }
  | { readonly ok: false; readonly error: RelayError };

export interface ReplayQuery {
  readonly after?: number;
  readonly kind?: IncomingEvent["kind"];
  readonly source?: string;
  readonly limit?: number;
}

export interface EventLog {
  append(event: IncomingEvent, signal?: AbortSignal): Promise<StoredEvent>;
  replay(query: ReplayQuery, signal?: AbortSignal): AsyncIterable<StoredEvent>;
}

export interface ClosableEventLog extends EventLog {
  close(): Promise<void>;
}

export interface Subscriber {
  accept(event: StoredEvent, signal: AbortSignal): Promise<void>;
}

export interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}

export interface BoundedAsyncQueue<T> extends AsyncIterable<T> {
  readonly capacity: number;
  readonly size: number;
  push(value: T, signal?: AbortSignal): Promise<void>;
  close(): void;
  fail(error: unknown): void;
}

export interface RelayHttpHeaders {
  get(name: string): string | null;
}

export interface RelayHttpRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: RelayHttpHeaders;
  readonly body: AsyncIterable<Uint8Array> | null;
}

export interface RelayHttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export type RelayHttpHandler = (
  request: RelayHttpRequest,
) => Promise<RelayHttpResponse>;

export interface ServeOptions {
  readonly host: string;
  readonly port: number;
  readonly onListen?: (port: number) => void;
}

export interface RelayHttpTarget {
  readonly accepting: boolean;
  readonly eventLog: ClosableEventLog;
  submit(event: IncomingEvent, signal?: AbortSignal): Promise<StoredEvent>;
}

export interface RuntimeCapabilities {
  readonly io: {
    stdout(text: string): void;
    stderr(text: string): void;
  };
  readonly signal: AbortSignal;
  openLog(path: string, capacity: number): ClosableEventLog;
  readInput(path: string, signal: AbortSignal): AsyncIterable<Uint8Array>;
  serve(
    options: ServeOptions,
    handler: RelayHttpHandler,
    signal: AbortSignal,
  ): Promise<void>;
}

export interface RelayRuntimeAdapter {
  readonly runtime: RuntimeName;
  readonly implementation: CapstoneImplementation;
  run(arguments_: readonly string[]): Promise<number>;
}

export interface EventRelay extends RelayHttpTarget {
  stopAccepting(): void;
  close(): Promise<void>;
}

export interface IdiomaticCoreModule {
  readonly CAPSTONE_IMPLEMENTATION: CapstoneImplementation;
  parseEvent(value: unknown): ParseResult;
  normalizeReplayQuery(
    query: ReplayQuery,
  ): Required<Pick<ReplayQuery, "after" | "limit">> &
    Pick<ReplayQuery, "kind" | "source">;
  eventMatches(event: StoredEvent, query: ReplayQuery): boolean;
  readonly InMemoryEventLog: new (capacity?: number) => ClosableEventLog;
  readonly BoundedAsyncQueue: new <T>(capacity: number) => BoundedAsyncQueue<T>;
  readonly EventRelay: new (
    eventLog: ClosableEventLog,
    subscribers?: readonly Subscriber[],
    queueCapacity?: number,
  ) => EventRelay;
  deferred<T>(): Deferred<T>;
  decodeNdjsonLines(
    chunks: AsyncIterable<Uint8Array>,
    signal?: AbortSignal,
  ): AsyncIterable<{ readonly number: number; readonly text: string }>;
  parseRelayCli(arguments_: readonly string[]): unknown;
  runRelayCli(
    arguments_: readonly string[],
    capabilities: RuntimeCapabilities,
  ): Promise<number>;
  relayFailure(code: RelayErrorCode, message: string): RelayError;
  createRelayHttpHandler(relay: RelayHttpTarget): RelayHttpHandler;
  createRuntimeAdapter(
    runtime: RuntimeName,
    capabilities?: RuntimeCapabilities,
  ): RelayRuntimeAdapter;
}

export interface IdiomaticAdapterModule {
  readonly RUNTIME: RuntimeName;
  createAdapter(): RelayRuntimeAdapter;
  main(arguments_: readonly string[]): Promise<number>;
}

export type FileEventLogFactory = (path: string, capacity?: number) => ClosableEventLog;

export type ServeRelay = (
  options: ServeOptions,
  handler: RelayHttpHandler,
  signal: AbortSignal,
) => Promise<void>;
