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
