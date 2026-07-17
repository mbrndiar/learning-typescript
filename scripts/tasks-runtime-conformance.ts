import {
  type Task,
  type TaskFilter,
  TaskNotFoundError,
  type TaskRepository,
  TaskService,
  type UpdateTaskDto,
} from "../projects/tasks/solution/core/index.ts";
import { dispatchHttp } from "../projects/tasks/solution/core/http.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

class MemoryTaskRepository implements TaskRepository {
  readonly #tasks = new Map<number, Task>();
  #nextId = 1;

  async create(title: string): Promise<Task> {
    const task = Object.freeze({ id: this.#nextId, title, completed: false });
    this.#nextId += 1;
    this.#tasks.set(task.id, task);
    return task;
  }

  async list(filter: TaskFilter): Promise<readonly Task[]> {
    return Object.freeze(
      [...this.#tasks.values()].filter(
        (task) => filter.completed === undefined || task.completed === filter.completed,
      ),
    );
  }

  async get(id: number): Promise<Task> {
    const task = this.#tasks.get(id);
    if (task === undefined) throw new TaskNotFoundError(id);
    return task;
  }

  async update(id: number, update: UpdateTaskDto): Promise<Task> {
    const task = await this.get(id);
    const updated = Object.freeze({
      id,
      title: update.title ?? task.title,
      completed: update.completed ?? task.completed,
    });
    this.#tasks.set(id, updated);
    return updated;
  }

  async delete(id: number): Promise<void> {
    if (!this.#tasks.delete(id)) throw new TaskNotFoundError(id);
  }

  async close(): Promise<void> {}
}

const service = new TaskService(new MemoryTaskRepository());
const created = await service.create({ title: "  Prove portable Tasks  " });
assert(
  created.id === 1 && created.title === "Prove portable Tasks" && !created.completed,
  "Task service must normalize and create tasks",
);

const completed = await service.update(created.id, { completed: true });
assert(completed.completed, "Task service must update completion state");
assert((await service.list(true)).length === 1, "Task filters must stay portable");

const health = await dispatchHttp(service, {
  method: "GET",
  url: "/health",
  headers: {},
  body: new Uint8Array(),
});
assert(health.status === 200, "Task HTTP dispatch must expose health");
assert(
  health.headers["content-type"] === "application/json; charset=utf-8",
  "Task HTTP responses must retain their JSON media type",
);

console.log("Task core conformance passed");
