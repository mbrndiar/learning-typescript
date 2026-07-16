import {
  createRuntimeAdapter,
  type RelayRuntimeAdapter,
  type RuntimeName,
} from "../core/index.ts";

export const RUNTIME: RuntimeName = "node";

export function createAdapter(): RelayRuntimeAdapter {
  return createRuntimeAdapter(RUNTIME);
}

export function main(
  arguments_: readonly string[] = process.argv.slice(2),
): Promise<number> {
  return createAdapter().run(arguments_);
}

if (import.meta.main) {
  process.exitCode = await main();
}
