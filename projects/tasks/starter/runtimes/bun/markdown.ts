import {
  IncompleteProjectError,
  type Task,
  type TaskFilter,
  type TaskRepository,
  type UpdateTaskDto,
} from "../../core/index.ts";

export function publishBunMarkdownAtomically(
  _path: string,
  _source: string,
  _temporaryOverride?: string,
): Promise<void> {
  return Promise.reject(new IncompleteProjectError("Bun atomic Markdown publication"));
}

export class BunMarkdownRepository implements TaskRepository {
  constructor(_path: string) {}
  create(_title: string): Promise<Task> {
    return Promise.reject(new IncompleteProjectError("Bun Markdown repository"));
  }
  list(_filter: TaskFilter): Promise<readonly Task[]> {
    return Promise.reject(new IncompleteProjectError("Bun Markdown repository"));
  }
  get(_id: number): Promise<Task> {
    return Promise.reject(new IncompleteProjectError("Bun Markdown repository"));
  }
  update(_id: number, _update: UpdateTaskDto): Promise<Task> {
    return Promise.reject(new IncompleteProjectError("Bun Markdown repository"));
  }
  delete(_id: number): Promise<void> {
    return Promise.reject(new IncompleteProjectError("Bun Markdown repository"));
  }
  async close(): Promise<void> {}
}
