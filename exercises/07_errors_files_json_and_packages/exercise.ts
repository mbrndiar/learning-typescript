export interface Task {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
}

// CONTRACT: accept only the public Task JSON shape from an untrusted boundary
// and return normalized tasks; throw TypeError instead of guessing.
export function parseTasks(_value: unknown): Task[] {
  // TODO: reject non-arrays and malformed task entries without using `any`.
  return [];
}

// CONTRACT: validate an RFC 3339 timestamp with Z or a numeric offset, reject
// impossible calendar values, and return canonical UTC millisecond form.
export function normalizeTimestamp(_value: unknown): string {
  throw new Error("TODO: validate and normalize the timestamp boundary");
}

// CONTRACT: normalize the timestamp, then format its calendar fields in the
// requested IANA time zone with a numeric GMT offset.
export function formatTimestampInZone(_value: unknown, _timeZone: string): string {
  throw new Error("TODO: format the timestamp in the requested IANA time zone");
}
