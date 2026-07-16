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
  | "log_corrupt"
  | "unsupported_log_version"
  | "log_full"
  | "log_io"
  | "subscriber_failed"
  | "cancelled"
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

export interface Subscriber {
  accept(event: StoredEvent, signal: AbortSignal): Promise<void>;
}

export type RuntimeName = "node" | "deno" | "bun";

export interface RelayRuntimeAdapter {
  readonly runtime: RuntimeName;
  readonly implementation: CapstoneImplementation;
  run(arguments_: readonly string[]): Promise<number>;
}
