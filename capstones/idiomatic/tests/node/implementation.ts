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

export interface NodeIdiomaticTarget {
  readonly implementation: CapstoneImplementation;
  readonly core: IdiomaticCoreModule;
  readonly adapter: IdiomaticAdapterModule;
  readonly fileLogModule: object;
  readonly runtimeModule: object;
  readonly createFileLog: FileEventLogFactory;
  readonly serve: ServeRelay;
}

export function selectedNodeImplementation(
  value: string | undefined = process.env.CAPSTONE_IMPLEMENTATION,
): CapstoneImplementation {
  return selectCapstoneImplementation(value);
}

export async function loadNodeIdiomaticTarget(
  implementation: CapstoneImplementation = selectedNodeImplementation(),
): Promise<NodeIdiomaticTarget> {
  if (implementation === "starter") {
    const [core, adapter, fileLog, runtime] = await Promise.all([
      import("../../starter/core/index.ts"),
      import("../../starter/node/main.ts"),
      import("../../starter/node/file-log.ts"),
      import("../../starter/node/runtime.ts"),
    ]);
    return {
      implementation,
      core,
      adapter,
      fileLogModule: fileLog,
      runtimeModule: runtime,
      createFileLog: (path, capacity) => new fileLog.NodeFileEventLog(path, capacity),
      serve: runtime.serveNodeRelay,
    };
  }
  const [core, adapter, fileLog, runtime] = await Promise.all([
    import("../../solution/core/index.ts"),
    import("../../solution/node/main.ts"),
    import("../../solution/node/file-log.ts"),
    import("../../solution/node/runtime.ts"),
  ]);
  return {
    implementation,
    core,
    adapter,
    fileLogModule: fileLog,
    runtimeModule: runtime,
    createFileLog: (path, capacity) => new fileLog.NodeFileEventLog(path, capacity),
    serve: runtime.serveNodeRelay,
  };
}
