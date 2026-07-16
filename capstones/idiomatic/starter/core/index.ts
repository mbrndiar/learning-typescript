import {
  CapstoneIncompleteError,
  type CapstoneImplementation,
} from "../../../shared/harness.ts";
import type { ParseResult, RelayRuntimeAdapter, RuntimeName } from "./contracts.ts";

export * from "./contracts.ts";

export const CAPSTONE_IMPLEMENTATION: CapstoneImplementation = "starter";

export function parseEvent(_value: unknown): ParseResult {
  return {
    ok: false,
    error: {
      code: "not_implemented",
      message: "event parsing is intentionally incomplete in the capstone scaffold",
      details: { implementation: CAPSTONE_IMPLEMENTATION },
    },
  };
}
export function createRuntimeAdapter(runtime: RuntimeName): RelayRuntimeAdapter {
  return {
    runtime,
    implementation: CAPSTONE_IMPLEMENTATION,
    run(_arguments) {
      return Promise.reject(
        new CapstoneIncompleteError(
          "idiomatic",
          CAPSTONE_IMPLEMENTATION,
          `${runtime} relay adapter`,
        ),
      );
    },
  };
}
