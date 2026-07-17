import {
  IncompleteProjectError,
  type Task,
  type TaskFilter,
  type TaskRepository,
  type UpdateTaskDto,
} from "../../core/index.ts";

export class DenoMarkdownRepository implements TaskRepository {
  constructor(_path: string) {}
  create(_title: string): Promise<Task> {
    return Promise.reject(new IncompleteProjectError("Deno Markdown repository"));
  }
  list(_filter: TaskFilter): Promise<readonly Task[]> {
    return Promise.reject(new IncompleteProjectError("Deno Markdown repository"));
  }
  get(_id: number): Promise<Task> {
    return Promise.reject(new IncompleteProjectError("Deno Markdown repository"));
  }
  update(_id: number, _update: UpdateTaskDto): Promise<Task> {
    return Promise.reject(new IncompleteProjectError("Deno Markdown repository"));
  }
  delete(_id: number): Promise<void> {
    return Promise.reject(new IncompleteProjectError("Deno Markdown repository"));
  }
  async close(): Promise<void> {}
}
