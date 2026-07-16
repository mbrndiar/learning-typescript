import {
  selectCapstoneImplementation,
  type CapstoneImplementation,
} from "../../../shared/harness.ts";
import type {
  IdiomaticAdapterModule,
  IdiomaticCoreModule,
} from "../contracts/scaffold.ts";

export interface NodeIdiomaticTarget {
  readonly implementation: CapstoneImplementation;
  readonly core: IdiomaticCoreModule;
  readonly adapter: IdiomaticAdapterModule;
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
    return {
      implementation,
      core: await import("../../starter/core/index.ts"),
      adapter: await import("../../starter/node/main.ts"),
    };
  }
  return {
    implementation,
    core: await import("../../solution/core/index.ts"),
    adapter: await import("../../solution/node/main.ts"),
  };
}
