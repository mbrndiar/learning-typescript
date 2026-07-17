import { IncompleteProjectError, type TaskService } from "../../core/index.ts";
import type { RunningServer } from "../../core/runtime.ts";

export interface NodeServerOptions {
  readonly service: TaskService;
  readonly hostname?: string;
  readonly port?: number;
  readonly logError?: (error: unknown) => void;
}
export function startNodeServer(_options: NodeServerOptions): Promise<RunningServer> {
  return Promise.reject(new IncompleteProjectError("Node HTTP server"));
}
