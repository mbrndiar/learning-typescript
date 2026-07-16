import { createRuntimeAdapter, type RelayRuntimeAdapter, type RuntimeName } from "../core/index.ts";

export const RUNTIME: RuntimeName = "deno";

export function createAdapter(): RelayRuntimeAdapter {
  return createRuntimeAdapter(RUNTIME);
}

export function main(arguments_: readonly string[] = Deno.args): Promise<number> {
  return createAdapter().run(arguments_);
}

if (import.meta.main) {
  Deno.exit(await main());
}
