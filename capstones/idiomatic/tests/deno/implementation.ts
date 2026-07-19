import {
  type CapstoneImplementation,
  selectCapstoneImplementation,
} from "../../../shared/harness.ts";
import type {
  FileEventLogFactory,
  IdiomaticAdapterModule,
  IdiomaticCoreModule,
  ServeRelay,
} from "../contracts/scaffold.ts";

export interface DenoIdiomaticTarget {
  readonly implementation: CapstoneImplementation;
  readonly core: IdiomaticCoreModule;
  readonly adapter: IdiomaticAdapterModule;
  readonly fileLogModule: object;
  readonly runtimeModule: object;
  readonly createFileLog: FileEventLogFactory;
  readonly serve: ServeRelay;
}

export function selectedDenoImplementation(
  value: string | undefined = Deno.env.get("CAPSTONE_IMPLEMENTATION"),
): CapstoneImplementation {
  return selectCapstoneImplementation(value);
}

export async function loadDenoIdiomaticTarget(
  implementation: CapstoneImplementation,
): Promise<DenoIdiomaticTarget> {
  if (implementation === "starter") {
    const [core, adapter, fileLog, runtime] = await Promise.all([
      import("../../starter/core/index.ts"),
      import("../../starter/deno/main.ts"),
      import("../../starter/deno/file-log.ts"),
      import("../../starter/deno/runtime.ts"),
    ]);
    return {
      implementation,
      core,
      adapter,
      fileLogModule: fileLog,
      runtimeModule: runtime,
      createFileLog: (path, capacity) => new fileLog.DenoFileEventLog(path, capacity),
      serve: runtime.serveDenoRelay,
    };
  }
  const [core, adapter, fileLog, runtime] = await Promise.all([
    import("../../solution/core/index.ts"),
    import("../../solution/deno/main.ts"),
    import("../../solution/deno/file-log.ts"),
    import("../../solution/deno/runtime.ts"),
  ]);
  return {
    implementation,
    core,
    adapter,
    fileLogModule: fileLog,
    runtimeModule: runtime,
    createFileLog: (path, capacity) => new fileLog.DenoFileEventLog(path, capacity),
    serve: runtime.serveDenoRelay,
  };
}
