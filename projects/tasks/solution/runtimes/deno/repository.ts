import type { TaskRepository } from "../../core/index.ts";
import type { BackendName } from "../../core/runtime.ts";
import { DenoMarkdownRepository } from "./markdown.ts";

export async function openDenoRepository(
  backend: BackendName,
  path: string,
): Promise<TaskRepository> {
  if (backend === "markdown") return new DenoMarkdownRepository(path);
  const { DenoSqliteRepository } = await import("./sqlite.ts");
  return new DenoSqliteRepository(path);
}
