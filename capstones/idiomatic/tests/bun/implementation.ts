import {
  selectCapstoneImplementation,
  type CapstoneImplementation,
} from "../../../shared/harness.ts";
import type {
  IdiomaticAdapterModule,
  IdiomaticCoreModule,
} from "../contracts/scaffold.ts";

export interface BunIdiomaticTarget {
  readonly implementation: CapstoneImplementation;
  readonly core: IdiomaticCoreModule;
  readonly adapter: IdiomaticAdapterModule;
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
    return {
      implementation,
      core: await import("../../starter/core/index.ts"),
      adapter: await import("../../starter/bun/main.ts"),
    };
  }
  return {
    implementation,
    core: await import("../../solution/core/index.ts"),
    adapter: await import("../../solution/bun/main.ts"),
  };
}
