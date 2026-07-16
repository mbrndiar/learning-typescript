import {
  CapstoneIncompleteError,
  type CapstoneImplementation,
} from "../../../shared/harness.ts";
import type { ComparativeApplication } from "../../starter/src/index.ts";

export interface ComparativeModule {
  readonly CAPSTONE_IMPLEMENTATION: CapstoneImplementation;
  readonly SPEC_VERSION: string;
  createApplication(): ComparativeApplication;
  main(arguments_: readonly string[]): Promise<number>;
}

export interface ComparativeEntryModule {
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
      "operation must expose scaffold status",
    );
    assert(
      error.code === "CAPSTONE_INCOMPLETE",
      "incomplete error code must remain stable",
    );
    assert(error.track === "comparative", "error must identify the comparative track");
    assert(
      error.implementation === implementation,
      "error must identify the selected implementation",
    );
    return;
  }
  throw new Error("unfinished comparative operation unexpectedly succeeded");
}

export function assertSameComparativeBoundary(
  starter: ComparativeModule,
  solution: ComparativeModule,
  starterEntry: ComparativeEntryModule,
  solutionEntry: ComparativeEntryModule,
): void {
  assert(
    exportedNames(starter) === exportedNames(solution),
    "starter and solution source exports must match",
  );
  assert(
    exportedNames(starterEntry) === exportedNames(solutionEntry),
    "starter and solution entry exports must match",
  );
}

export async function runStarterScaffoldContract(
  module: ComparativeModule,
  entry: ComparativeEntryModule,
): Promise<void> {
  assert(
    module.CAPSTONE_IMPLEMENTATION === "starter",
    "module must identify its implementation",
  );
  assert(
    module.SPEC_VERSION === "1.0.0",
    "module must identify the frozen spec version",
  );
  await assertIncomplete(() => module.createApplication().run([]), "starter");
  await assertIncomplete(() => module.main([]), "starter");
  await assertIncomplete(() => entry.main([]), "starter");
}

export function assertSolutionScaffoldContract(
  module: ComparativeModule,
  entry: ComparativeEntryModule,
): void {
  assert(
    module.CAPSTONE_IMPLEMENTATION === "solution",
    "solution module must identify its implementation",
  );
  assert(module.SPEC_VERSION === "1.0.0", "solution must implement the frozen spec");
  assert(typeof module.createApplication().run === "function", "solution app must run");
  assert(typeof module.main === "function", "solution source entry must run");
  assert(typeof entry.main === "function", "solution Node entry must run");
}
