import { IncompleteProjectError, type TaskService } from "../../core/index.ts";
import type { RunningServer } from "../../core/runtime.ts";

export interface BunServerOptions {
  readonly service: TaskService;
  readonly hostname?: string;
  readonly port?: number;
  readonly logError?: (error: unknown) => void;
}
export function startBunServer(_options: BunServerOptions): RunningServer {
  throw new IncompleteProjectError("Bun HTTP server");
}
