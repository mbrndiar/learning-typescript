import type { CapstoneImplementation } from "../../../shared/harness.ts";
import type {
  RelayRuntimeAdapter,
  RuntimeCapabilities,
  RuntimeName,
} from "./contracts.ts";
import { relayFailure } from "./errors.ts";
import { runRelayCli } from "./cli.ts";

export * from "./cli.ts";
export * from "./contracts.ts";
export * from "./domain.ts";
export * from "./errors.ts";
export * from "./http.ts";
export * from "./log.ts";
export * from "./ndjson.ts";
export * from "./queue.ts";
export * from "./relay.ts";

export const CAPSTONE_IMPLEMENTATION: CapstoneImplementation = "solution";

export function createRuntimeAdapter(
  runtime: RuntimeName,
  capabilities?: RuntimeCapabilities,
): RelayRuntimeAdapter {
  return {
    runtime,
    implementation: CAPSTONE_IMPLEMENTATION,
    run(arguments_) {
      if (capabilities === undefined) {
        return Promise.reject(
          relayFailure(
            "not_implemented",
            `${runtime} runtime capabilities were not provided`,
          ),
        );
      }
      return runRelayCli(arguments_, capabilities);
    },
  };
}
