import type { CapstoneImplementation } from "../../../shared/harness.ts";
import type {
  IdiomaticAdapterModule,
  IdiomaticCoreModule,
  RuntimeName,
} from "./api.ts";

export type {
  FileEventLogFactory,
  IdiomaticAdapterModule,
  IdiomaticCoreModule,
  RuntimeName,
  ServeRelay,
} from "./api.ts";

export interface IdiomaticScaffoldBoundary {
  readonly implementation: CapstoneImplementation;
  readonly core: IdiomaticCoreModule;
  readonly adapter: IdiomaticAdapterModule;
  readonly fileLogModule: object;
  readonly runtimeModule: object;
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function exportedNames(module: object): string {
  return Object.keys(module).sort().join(",");
}

function assertExports(
  module: object,
  expected: readonly string[],
  boundary: string,
): void {
  assert(
    exportedNames(module) === [...expected].sort().join(","),
    `${boundary} exports must match the documented boundary`,
  );
}

function expectedRuntimeExports(runtime: RuntimeName): {
  readonly fileLog: readonly string[];
  readonly runtime: readonly string[];
} {
  switch (runtime) {
    case "node":
      return {
        fileLog: ["NodeFileEventLog", "NodeLogStorage"],
        runtime: ["createNodeCapabilities", "serveNodeRelay"],
      };
    case "deno":
      return {
        fileLog: ["DenoFileEventLog", "DenoLogStorage"],
        runtime: ["createDenoCapabilities", "serveDenoRelay"],
      };
    case "bun":
      return {
        fileLog: ["BunFileEventLog", "BunLogStorage"],
        runtime: ["createBunCapabilities", "serveBunRelay"],
      };
  }
}

function assertCoreShape(core: IdiomaticCoreModule): void {
  assert(typeof core.parseEvent === "function", "core must expose parseEvent");
  assert(
    typeof core.normalizeReplayQuery === "function",
    "core must expose normalizeReplayQuery",
  );
  assert(typeof core.eventMatches === "function", "core must expose eventMatches");
  assert(
    typeof core.InMemoryEventLog === "function",
    "core must expose InMemoryEventLog",
  );
  assert(
    typeof core.BoundedAsyncQueue === "function",
    "core must expose BoundedAsyncQueue",
  );
  assert(typeof core.EventRelay === "function", "core must expose EventRelay");
  assert(typeof core.deferred === "function", "core must expose deferred");
  assert(
    typeof core.decodeNdjsonLines === "function",
    "core must expose decodeNdjsonLines",
  );
  assert(typeof core.parseRelayCli === "function", "core must expose parseRelayCli");
  assert(typeof core.runRelayCli === "function", "core must expose runRelayCli");
  assert(typeof core.relayFailure === "function", "core must expose relayFailure");
  assert(
    typeof core.createRelayHttpHandler === "function",
    "core must expose createRelayHttpHandler",
  );
  assert(
    typeof core.createRuntimeAdapter === "function",
    "core must expose createRuntimeAdapter",
  );
}

export function assertSameIdiomaticBoundary(
  starter: IdiomaticScaffoldBoundary,
  solution: IdiomaticScaffoldBoundary,
): void {
  assert(
    exportedNames(starter.core) === exportedNames(solution.core),
    "starter and solution core exports must match",
  );
  assert(
    exportedNames(starter.adapter) === exportedNames(solution.adapter),
    "starter and solution adapter exports must match",
  );
  assert(
    exportedNames(starter.fileLogModule) === exportedNames(solution.fileLogModule),
    "starter and solution file-log exports must match",
  );
  assert(
    exportedNames(starter.runtimeModule) === exportedNames(solution.runtimeModule),
    "starter and solution runtime exports must match",
  );
}

export function runIdiomaticScaffoldContract(
  target: IdiomaticScaffoldBoundary,
  runtime: RuntimeName,
): void {
  assert(
    target.core.CAPSTONE_IMPLEMENTATION === target.implementation,
    "core must identify its implementation",
  );
  assert(target.adapter.RUNTIME === runtime, "entry module must identify its runtime");
  assert(typeof target.adapter.main === "function", "entry module must expose main");
  const adapter = target.adapter.createAdapter();
  assert(adapter.runtime === runtime, "adapter must identify its runtime");
  assert(
    adapter.implementation === target.implementation,
    "adapter must identify its implementation",
  );
  assert(typeof adapter.run === "function", "adapter must expose run");
  assertCoreShape(target.core);
  assertExports(target.adapter, ["RUNTIME", "createAdapter", "main"], "entry module");
  const expected = expectedRuntimeExports(runtime);
  assertExports(target.fileLogModule, expected.fileLog, "file-log module");
  assertExports(target.runtimeModule, expected.runtime, "runtime module");
}
