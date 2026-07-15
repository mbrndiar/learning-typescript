import { parseTask, type Task } from "../task-manager/task.ts";

export type Fetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export class TaskClientError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "TaskClientError";
  }
}

export class TaskClient {
  constructor(
    private readonly baseUrl: URL,
    private readonly request: Fetch = fetch,
    private readonly timeoutMilliseconds = 5_000,
  ) {}

  async list(): Promise<readonly Task[]> {
    const value = await this.send("/tasks");
    if (!Array.isArray(value)) {
      throw new TypeError("task API response must be an array");
    }
    return value.map((task, index) => parseTask(task, `tasks[${index}]`));
  }

  async add(title: string): Promise<Task> {
    return parseTask(
      await this.send("/tasks", {
        method: "POST",
        body: JSON.stringify({ title }),
      }),
    );
  }

  async complete(id: number): Promise<Task> {
    return parseTask(await this.send(`/tasks/${id}/complete`, { method: "PATCH" }));
  }

  async remove(id: number): Promise<void> {
    await this.send(`/tasks/${id}`, { method: "DELETE" }, true);
  }

  private async send(
    path: string,
    init: RequestInit = {},
    expectEmpty = false,
  ): Promise<unknown> {
    const response = await this.request(new URL(path, this.baseUrl), {
      ...init,
      headers: {
        accept: "application/json",
        ...(init.body === undefined ? {} : { "content-type": "application/json" }),
        ...init.headers,
      },
      signal: AbortSignal.timeout(this.timeoutMilliseconds),
    });

    if (!response.ok) {
      const message = (await response.text()).trim();
      throw new TaskClientError(
        response.status,
        message === "" ? `task API returned ${response.status}` : message,
      );
    }
    if (expectEmpty || response.status === 204) {
      return undefined;
    }
    return (await response.json()) as unknown;
  }
}
