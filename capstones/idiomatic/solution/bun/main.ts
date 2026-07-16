import {
  createRuntimeAdapter,
  type RelayRuntimeAdapter,
  type RuntimeName,
} from "../core/index.ts";
import { createBunCapabilities } from "./runtime.ts";

export const RUNTIME: RuntimeName = "bun";

export function createAdapter(): RelayRuntimeAdapter {
  const controller = new AbortController();
  const adapter = createRuntimeAdapter(
    RUNTIME,
    createBunCapabilities(controller.signal),
  );
  return {
    ...adapter,
    async run(arguments_) {
      const cancel = () => controller.abort();
      process.once("SIGINT", cancel);
      process.once("SIGTERM", cancel);
      try {
        return await adapter.run(arguments_);
      } finally {
        process.off("SIGINT", cancel);
        process.off("SIGTERM", cancel);
      }
    },
  };
}

export function main(
  arguments_: readonly string[] = Bun.argv.slice(2),
): Promise<number> {
  return createAdapter().run(arguments_);
}

if (import.meta.main) {
  process.exitCode = await main();
}
