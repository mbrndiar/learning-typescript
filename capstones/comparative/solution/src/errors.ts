import type { JsonValue } from "./domain.ts";

export type KvErrorCategory =
  | "usage"
  | "invalid_argument"
  | "invalid_json"
  | "invalid_value"
  | "conflict"
  | "not_found"
  | "busy"
  | "unsupported_schema"
  | "invalid_storage"
  | "revision_exhausted"
  | "storage_error";

export class KvError extends Error {
  constructor(
    readonly exitCode: 2 | 3 | 4 | 5,
    readonly category: KvErrorCategory,
    readonly details: Readonly<Record<string, JsonValue>>,
  ) {
    super(category);
    this.name = "KvError";
  }

  envelope(): JsonValue {
    return {
      ok: false,
      error: {
        category: this.category,
        details: this.details,
      },
    };
  }
}

export function usageError(): KvError {
  return new KvError(2, "usage", { reason: "invalid_cli" });
}

export function invalidArgumentError(
  field: "db" | "key" | "expect",
  reason: string,
): KvError {
  return new KvError(2, "invalid_argument", { field, reason });
}

export function invalidJsonError(): KvError {
  return new KvError(2, "invalid_json", { reason: "syntax" });
}

export function invalidValueError(reason: string): KvError {
  return new KvError(2, "invalid_value", { reason });
}

export function invalidStorageError(reason: string, key?: string): KvError {
  return new KvError(
    5,
    "invalid_storage",
    key === undefined ? { reason } : { reason, key },
  );
}

export function storageError(operation: string): KvError {
  return new KvError(5, "storage_error", {
    operation,
    reason: "storage_failure",
  });
}
