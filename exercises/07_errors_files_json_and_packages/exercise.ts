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
