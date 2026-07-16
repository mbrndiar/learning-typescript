import {
  CapstoneIncompleteError,
  type CapstoneImplementation,
} from "../../../shared/harness.ts";

export type JsonValue =
  | null
  | boolean
  | string
  | number
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export interface ComparativeApplication {
  run(arguments_: readonly string[]): Promise<number>;
}

export const CAPSTONE_IMPLEMENTATION: CapstoneImplementation = "starter";
export const SPEC_VERSION = "1.0.0";

export function createApplication(): ComparativeApplication {
  return {
    async run(_arguments) {
      // TODO(milestone 1): validate keys, revisions, expectations, and restricted JSON.
      // TODO(milestone 2): implement the exact four-command CLI and JSON envelopes.
      // TODO(milestone 3): initialize, validate, and migrate the SQLite schema.
      // TODO(milestone 4): add global revisions, CAS, and immediate transactions.
      // TODO(milestone 5): pass the real independent-process contention fixtures.
      throw new CapstoneIncompleteError(
        "comparative",
        CAPSTONE_IMPLEMENTATION,
        "the versioned configuration store",
      );
    },
  };
}

export function main(arguments_: readonly string[]): Promise<number> {
  return createApplication().run(arguments_);
}
