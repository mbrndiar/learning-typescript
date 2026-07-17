import {
  type CreateTaskDto,
  IncompleteProjectError,
  type Task,
  type TaskClient,
  type TaskFilter,
  type UpdateTaskDto,
} from "../core/index.ts";

export interface FetchClientOptions {
  readonly baseUrl: string | URL;
  readonly timeoutMs?: number;
  readonly fetch?: FetchFunction;
  readonly maximumResponseBytes?: number;
}
export type FetchFunction = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;
export class FetchTaskClient implements TaskClient {
  constructor(_options: FetchClientOptions) {}
  create(_input: CreateTaskDto): Promise<Task> {
    return Promise.reject(new IncompleteProjectError("Fetch client create"));
  }
  list(_filter: TaskFilter): Promise<readonly Task[]> {
    return Promise.reject(new IncompleteProjectError("Fetch client list"));
  }
  get(_id: number): Promise<Task> {
    return Promise.reject(new IncompleteProjectError("Fetch client get"));
  }
  update(_id: number, _input: UpdateTaskDto): Promise<Task> {
    return Promise.reject(new IncompleteProjectError("Fetch client update"));
  }
  delete(_id: number): Promise<void> {
    return Promise.reject(new IncompleteProjectError("Fetch client delete"));
  }
}
