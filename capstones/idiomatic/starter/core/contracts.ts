import type { CapstoneImplementation } from "../../../shared/harness.ts";

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

export interface LogStorage {
  readText(): Promise<string | undefined>;
  createText(text: string): Promise<void>;
  appendText(text: string): Promise<void>;
  close(): Promise<void>;
}

export interface CliIo {
  stdout(text: string): void;
  stderr(text: string): void;
}

export interface HttpHeaders {
  get(name: string): string | null;
}

export interface RelayHttpRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: HttpHeaders;
  readonly body: AsyncIterable<Uint8Array> | null;
}

export interface RelayHttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export interface RelayHttpTarget {
  readonly accepting: boolean;
  readonly eventLog: ClosableEventLog;
  submit(event: IncomingEvent, signal?: AbortSignal): Promise<StoredEvent>;
}

export type RelayHttpHandler = (
  request: RelayHttpRequest,
) => Promise<RelayHttpResponse>;

export interface ServeOptions {
  readonly host: string;
  readonly port: number;
  readonly onListen?: (port: number) => void;
}

export interface RuntimeCapabilities {
  readonly io: CliIo;
  readonly signal: AbortSignal;
  openLog(path: string, capacity: number): ClosableEventLog;
  readInput(path: string, signal: AbortSignal): AsyncIterable<Uint8Array>;
  serve(
    options: ServeOptions,
    handler: RelayHttpHandler,
    signal: AbortSignal,
  ): Promise<void>;
}

export type RuntimeName = "node" | "deno" | "bun";

export interface RelayRuntimeAdapter {
  readonly runtime: RuntimeName;
  readonly implementation: CapstoneImplementation;
  run(arguments_: readonly string[]): Promise<number>;
}
