import { IncompleteProjectError, type TaskService } from "../../core/index.ts";
import type { RunningServer } from "../../core/runtime.ts";

export interface DenoServerOptions {
  readonly service: TaskService;
  readonly hostname?: string;
  readonly port?: number;
  readonly logError?: (error: unknown) => void;
}
export function startDenoServer(_options: DenoServerOptions): Promise<RunningServer> {
  return Promise.reject(new IncompleteProjectError("Deno HTTP server"));
}
