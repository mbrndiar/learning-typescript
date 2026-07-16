import { createRuntimeAdapter, type RelayRuntimeAdapter, type RuntimeName } from "../core/index.ts";
import { createDenoCapabilities } from "./runtime.ts";

export const RUNTIME: RuntimeName = "deno";

export function createAdapter(): RelayRuntimeAdapter {
  const controller = new AbortController();
  const adapter = createRuntimeAdapter(
    RUNTIME,
    createDenoCapabilities(controller.signal),
  );
  return {
    ...adapter,
    async run(arguments_) {
      const cancel = () => controller.abort();
      const signals: readonly Deno.Signal[] = Deno.build.os === "windows"
        ? ["SIGINT"]
        : ["SIGINT", "SIGTERM"];
      for (const signal of signals) {
        Deno.addSignalListener(signal, cancel);
      }
      try {
        return await adapter.run(arguments_);
      } finally {
        for (const signal of signals) {
          Deno.removeSignalListener(signal, cancel);
        }
      }
    },
  };
}

export function main(
  arguments_: readonly string[] = Deno.args,
): Promise<number> {
  return createAdapter().run(arguments_);
}

if (import.meta.main) {
  Deno.exitCode = await main();
}
