export interface CreateTask {
  readonly title: string;
}

// Contract: accept only a decoded JSON object whose only field is a non-empty
// string title, return the normalized domain value, and reject malformed
// boundary data with TypeError.
export function parseCreateTask(_value: unknown): CreateTask {
  throw new Error("TODO: validate the request body");
}
