import {
  IncompleteProjectError,
  type Task,
  type TaskFilter,
  type TaskRepository,
  type UpdateTaskDto,
} from "../../core/index.ts";

export class NodeMarkdownRepository implements TaskRepository {
  constructor(_path: string) {}
  create(_title: string): Promise<Task> {
    return Promise.reject(new IncompleteProjectError("Node Markdown repository"));
  }
  list(_filter: TaskFilter): Promise<readonly Task[]> {
    return Promise.reject(new IncompleteProjectError("Node Markdown repository"));
  }
  get(_id: number): Promise<Task> {
    return Promise.reject(new IncompleteProjectError("Node Markdown repository"));
  }
  update(_id: number, _update: UpdateTaskDto): Promise<Task> {
    return Promise.reject(new IncompleteProjectError("Node Markdown repository"));
  }
  delete(_id: number): Promise<void> {
    return Promise.reject(new IncompleteProjectError("Node Markdown repository"));
  }
  async close(): Promise<void> {}
}
