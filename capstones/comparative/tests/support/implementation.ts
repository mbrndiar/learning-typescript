import {
  selectCapstoneImplementation,
  type CapstoneImplementation,
} from "../../../shared/harness.ts";
import type {
  ComparativeEntryModule,
  ComparativeModule,
} from "../contracts/scaffold.ts";

export interface ComparativeTarget {
  readonly implementation: CapstoneImplementation;
  readonly module: ComparativeModule;
  readonly entry: ComparativeEntryModule;
}

export function selectedComparativeImplementation(
  value: string | undefined = process.env.CAPSTONE_IMPLEMENTATION,
): CapstoneImplementation {
  return selectCapstoneImplementation(value);
}

export async function loadComparativeTarget(
  implementation: CapstoneImplementation = selectedComparativeImplementation(),
): Promise<ComparativeTarget> {
  if (implementation === "starter") {
    return {
      implementation,
      module: await import("../../starter/src/index.ts"),
      entry: await import("../../starter/node/main.ts"),
    };
  }
  return {
    implementation,
    module: await import("../../solution/src/index.ts"),
    entry: await import("../../solution/node/main.ts"),
  };
}
