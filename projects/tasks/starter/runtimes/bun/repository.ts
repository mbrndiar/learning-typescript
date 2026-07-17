import type { TaskRepository } from "../../core/index.ts";
import type { BackendName } from "../../core/runtime.ts";
import { BunMarkdownRepository } from "./markdown.ts";
import { BunSqliteRepository } from "./sqlite.ts";

export function openBunRepository(backend: BackendName, path: string): TaskRepository {
  return backend === "sqlite"
    ? new BunSqliteRepository(path)
    : new BunMarkdownRepository(path);
}
