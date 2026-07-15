import { TaskClientError, type TaskClient } from "../task-client/client.ts";
import { TaskNotFoundError, type TaskStorage } from "./storage.ts";
import type { Task } from "./task.ts";

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

  private translateNotFound(error: unknown, id: number): never {
    if (error instanceof TaskClientError && error.status === 404) {
      throw new TaskNotFoundError(id);
    }
    throw error;
  }
}
