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
