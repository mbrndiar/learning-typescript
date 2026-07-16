import {
  CapstoneIncompleteError,
  type CapstoneImplementation,
} from "../../../shared/harness.ts";
import type {
  ParseResult,
  RelayRuntimeAdapter,
  RuntimeName,
} from "../../starter/core/index.ts";

export interface IdiomaticCoreModule {
  readonly CAPSTONE_IMPLEMENTATION: CapstoneImplementation;
  parseEvent(value: unknown): ParseResult;
  createRuntimeAdapter(runtime: RuntimeName): RelayRuntimeAdapter;
}

export interface IdiomaticAdapterModule {
  readonly RUNTIME: RuntimeName;
  createAdapter(): RelayRuntimeAdapter;
  main(arguments_: readonly string[]): Promise<number>;
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function exportedNames(module: object): string {
  return Object.keys(module).sort().join(",");
}

async function assertIncomplete(
  operation: () => Promise<number>,
  implementation: CapstoneImplementation,
): Promise<void> {
  try {
    await operation();
  } catch (error: unknown) {
    assert(
      error instanceof CapstoneIncompleteError,
      "adapter must expose scaffold status",
    );
    assert(
      error.code === "CAPSTONE_INCOMPLETE",
      "incomplete error code must remain stable",
    );
    assert(error.track === "idiomatic", "error must identify the idiomatic track");
    assert(
      error.implementation === implementation,
      "error must identify the selected implementation",
    );
    return;
  }
  throw new Error("unfinished idiomatic operation unexpectedly succeeded");
}

export function assertSameIdiomaticBoundary(
  starterCore: IdiomaticCoreModule,
  solutionCore: IdiomaticCoreModule,
  starterAdapter: IdiomaticAdapterModule,
  solutionAdapter: IdiomaticAdapterModule,
): void {
  assert(
    exportedNames(starterCore) === exportedNames(solutionCore),
    "starter and solution core exports must match",
  );
  assert(
    exportedNames(starterAdapter) === exportedNames(solutionAdapter),
    "starter and solution adapter exports must match",
  );
}

export async function runIdiomaticScaffoldContract(
  implementation: CapstoneImplementation,
  runtime: RuntimeName,
  core: IdiomaticCoreModule,
  adapterModule: IdiomaticAdapterModule,
): Promise<void> {
  assert(
    core.CAPSTONE_IMPLEMENTATION === implementation,
    "core must identify its implementation",
  );

  const parsed = core.parseEvent({ kind: "metric" });
  assert(!parsed.ok, "scaffold parser must not accept an event");
  assert(
    parsed.error.code === "not_implemented",
    "scaffold parser must expose intentional incompleteness",
  );

  const adapter = adapterModule.createAdapter();
  assert(adapterModule.RUNTIME === runtime, "entry module must identify its runtime");
  assert(adapter.runtime === runtime, "adapter must identify its runtime");
  assert(
    adapter.implementation === implementation,
    "adapter must identify its implementation",
  );
  await assertIncomplete(() => adapter.run([]), implementation);
  await assertIncomplete(() => adapterModule.main([]), implementation);
}
