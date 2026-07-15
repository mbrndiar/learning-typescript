import { TaskClientError, type TaskClient } from "./client.ts";
import { TaskNotFoundError, type TaskStorage } from "../task-core/storage.ts";
import type { Task } from "../task-core/task.ts";

// Adapts a TaskClient to the TaskStorage contract so a remote server is just
// another interchangeable backend. Its whole job is translating protocol-level
// failures (HTTP 404) into the domain's TaskNotFoundError so callers stay
// unaware of the transport.
export class RestTaskStorage implements TaskStorage {
  constructor(private readonly client: TaskClient) {}

  list(): Promise<readonly Task[]> {
    return this.client.list();
  }

  add(title: string): Promise<Task> {
    return this.client.add(title);
  }

  async complete(id: number): Promise<Task> {
    try {
      return await this.client.complete(id);
    } catch (error: unknown) {
      this.translateNotFound(error, id);
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await this.client.remove(id);
    } catch (error: unknown) {
      this.translateNotFound(error, id);
    }
  }

  // Only a 404 maps to the not-found domain error; every other failure
  // propagates unchanged so real transport errors are never masked. Returns
  // never so the async methods above type-check without a fallthrough value.
  private translateNotFound(error: unknown, id: number): never {
    if (error instanceof TaskClientError && error.status === 404) {
      throw new TaskNotFoundError(id);
    }
    throw error;
  }
}
