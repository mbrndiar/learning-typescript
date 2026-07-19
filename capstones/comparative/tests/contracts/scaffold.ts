import type { CapstoneImplementation } from "../../../shared/harness.ts";

export interface ComparativeApplication {
  run(arguments_: readonly string[]): Promise<number>;
}

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

export function runComparativeScaffoldContract(
  implementation: CapstoneImplementation,
  module: ComparativeModule,
  entry: ComparativeEntryModule,
): void {
  assert(
    module.CAPSTONE_IMPLEMENTATION === implementation,
    "module must identify its implementation",
  );
  assert(
    module.SPEC_VERSION === "1.0.0",
    "module must identify the frozen spec version",
  );
  assert(
    typeof module.createApplication === "function",
    "module must expose createApplication",
  );
  assert(typeof module.main === "function", "module must expose main");
  assert(typeof entry.main === "function", "entry module must expose main");
  assert(
    typeof module.createApplication().run === "function",
    "application must expose run",
  );
}
