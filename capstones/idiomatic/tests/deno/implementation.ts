import {
  type CapstoneImplementation,
  selectCapstoneImplementation,
} from "../../../shared/harness.ts";
import type { IdiomaticAdapterModule, IdiomaticCoreModule } from "../contracts/scaffold.ts";

export interface DenoIdiomaticTarget {
  readonly implementation: CapstoneImplementation;
  readonly core: IdiomaticCoreModule;
  readonly adapter: IdiomaticAdapterModule;
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
    return {
      implementation,
      core: await import("../../starter/core/index.ts"),
      adapter: await import("../../starter/deno/main.ts"),
    };
  }
  return {
    implementation,
    core: await import("../../solution/core/index.ts"),
    adapter: await import("../../solution/deno/main.ts"),
  };
}
