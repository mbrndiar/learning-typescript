import { TaskNotFoundError, type TaskStorage } from "../task-core/storage.ts";
import { normalizeTitle, type Task } from "../task-core/task.ts";

export function assert(condition: unknown, message = "assertion failed"): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEquals(actual: unknown, expected: unknown, message?: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      message ?? `expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
}

export async function assertRejects(
  operation: () => Promise<unknown>,
  predicate: (error: unknown) => boolean,
): Promise<void> {
  try {
    await operation();
  } catch (error: unknown) {
    assert(predicate(error), `unexpected rejection: ${String(error)}`);
    return;
  }
  throw new Error("expected operation to reject");
}

export class MemoryTaskStorage implements TaskStorage {
  private readonly tasks = new Map<number, Task>();
  private nextId = 1;

  list(): Promise<readonly Task[]> {
    return Promise.resolve([...this.tasks.values()].map((task) => ({ ...task })));
  }

  add(title: string): Promise<Task> {
    const task: Task = {
      id: this.nextId,
      title: normalizeTitle(title),
      completed: false,
    };
    this.nextId += 1;
    this.tasks.set(task.id, task);
    return Promise.resolve({ ...task });
  }

  complete(id: number): Promise<Task> {
    const task = this.tasks.get(id);
    if (task === undefined) {
      return Promise.reject(new TaskNotFoundError(id));
    }
    const completed = { ...task, completed: true };
    this.tasks.set(id, completed);
    return Promise.resolve({ ...completed });
  }

  remove(id: number): Promise<void> {
    if (!this.tasks.delete(id)) {
      return Promise.reject(new TaskNotFoundError(id));
    }
    return Promise.resolve();
  }
}
