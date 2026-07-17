export interface CreateTask {
  readonly title: string;
}

export interface Task {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
}

export interface TaskServer {
  readonly url: string;
  close(): Promise<void>;
}

export function parseCreateTask(_value: unknown): CreateTask {
  throw new Error("TODO: validate the request body");
}

export async function startTaskServer(): Promise<TaskServer> {
  throw new Error("TODO: create and listen to a loopback REST server");
}
