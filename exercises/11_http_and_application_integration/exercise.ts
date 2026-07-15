export interface CreateTask {
  readonly title: string;
}

export function parseCreateTask(_value: unknown): CreateTask {
  throw new Error("TODO: validate the request body");
}
