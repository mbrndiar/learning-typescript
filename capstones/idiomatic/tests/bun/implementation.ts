import {
  selectCapstoneImplementation,
  type CapstoneImplementation,
} from "../../../shared/harness.ts";
import type {
  FileEventLogFactory,
  IdiomaticAdapterModule,
  IdiomaticCoreModule,
  ServeRelay,
} from "../contracts/scaffold.ts";

export interface BunIdiomaticTarget {
  readonly implementation: CapstoneImplementation;
  readonly core: IdiomaticCoreModule;
  readonly adapter: IdiomaticAdapterModule;
  readonly fileLogModule: object;
  readonly runtimeModule: object;
  readonly createFileLog: FileEventLogFactory;
  readonly serve: ServeRelay;
}

export function selectedBunImplementation(
  value: string | undefined = Bun.env.CAPSTONE_IMPLEMENTATION,
): CapstoneImplementation {
  return selectCapstoneImplementation(value);
}

export async function loadBunIdiomaticTarget(
  implementation: CapstoneImplementation = selectedBunImplementation(),
): Promise<BunIdiomaticTarget> {
  if (implementation === "starter") {
    const [core, adapter, fileLog, runtime] = await Promise.all([
      import("../../starter/core/index.ts"),
      import("../../starter/bun/main.ts"),
      import("../../starter/bun/file-log.ts"),
      import("../../starter/bun/runtime.ts"),
    ]);
    return {
      implementation,
      core,
      adapter,
      fileLogModule: fileLog,
      runtimeModule: runtime,
      createFileLog: (path, capacity) => new fileLog.BunFileEventLog(path, capacity),
      serve: runtime.serveBunRelay,
    };
  }
  const [core, adapter, fileLog, runtime] = await Promise.all([
    import("../../solution/core/index.ts"),
    import("../../solution/bun/main.ts"),
    import("../../solution/bun/file-log.ts"),
    import("../../solution/bun/runtime.ts"),
  ]);
  return {
    implementation,
    core,
    adapter,
    fileLogModule: fileLog,
    runtimeModule: runtime,
    createFileLog: (path, capacity) => new fileLog.BunFileEventLog(path, capacity),
    serve: runtime.serveBunRelay,
  };
}
