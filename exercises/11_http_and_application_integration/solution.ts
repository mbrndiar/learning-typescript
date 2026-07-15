export interface CreateTask {
  readonly title: string;
}

// parseCreateTask is the HTTP boundary for decoded JSON. It accepts only the
// shape this endpoint promises to understand, then returns normalized domain
// data for the rest of the program.
export function parseCreateTask(value: unknown): CreateTask {
  // Arrays are objects in JavaScript, but they are not valid request objects
  // for this endpoint.
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("request body must be an object");
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  // Rejecting unknown fields keeps the wire contract narrow and catches
  // client mistakes instead of silently ignoring data the client thought
  // mattered.
  if (keys.length !== 1 || keys[0] !== "title") {
    throw new TypeError("request body must contain only title");
  }
  if (typeof record.title !== "string" || record.title.trim() === "") {
    throw new TypeError("title must be a non-empty string");
  }

  // Trimming at the boundary means downstream code receives the application
  // value, not transport whitespace supplied by the client.
  return { title: record.title.trim() };
}
