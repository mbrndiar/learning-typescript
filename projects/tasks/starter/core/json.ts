import { IncompleteProjectError, ValidationError } from "./index.ts";

export const MAX_REQUEST_BYTES = 64 * 1024;
export const MAX_RESPONSE_BYTES = 1024 * 1024;
export const MAX_JSON_NESTING = 64;

export class BodyLimitError extends ValidationError {
  constructor(maximumBytes: number, cause?: unknown) {
    super(`body exceeds ${maximumBytes} bytes`);
    this.name = "BodyLimitError";
    if (cause !== undefined) this.cause = cause;
  }
}

export function parseStrictJsonBytes(
  _bytes: Uint8Array,
  _maximumBytes: number,
): unknown {
  throw new IncompleteProjectError("strict JSON parsing");
}
export function parseResponseJson(_bytes: Uint8Array): unknown {
  throw new IncompleteProjectError("response JSON parsing");
}
export function encodeJson(_value: unknown): Uint8Array {
  throw new IncompleteProjectError("JSON encoding");
}
export function readBoundedStream(
  _stream: ReadableStream<Uint8Array> | null,
  _maximumBytes: number,
): Promise<Uint8Array> {
  return Promise.reject(new IncompleteProjectError("bounded stream reading"));
}
