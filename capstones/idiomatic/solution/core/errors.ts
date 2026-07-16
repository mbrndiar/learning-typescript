import type { RelayError, RelayErrorCode } from "./contracts.ts";

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
  if (error instanceof RelayFailure) {
    return error;
  }
  return relayFailure(fallbackCode, fallbackMessage);
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted === true) {
    throw relayFailure("cancelled", "operation was cancelled");
  }
}
