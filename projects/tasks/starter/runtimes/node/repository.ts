import type { TaskRepository } from "../../core/index.ts";
import type { BackendName } from "../../core/runtime.ts";
import { NodeMarkdownRepository } from "./markdown.ts";
import { NodeSqliteRepository } from "./sqlite.ts";

export function openNodeRepository(backend: BackendName, path: string): TaskRepository {
  return backend === "sqlite"
    ? new NodeSqliteRepository(path)
    : new NodeMarkdownRepository(path);
}
