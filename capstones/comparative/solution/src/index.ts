import type { CapstoneImplementation } from "../../../shared/harness.ts";
import { runProcess } from "./cli.ts";

export type { JsonValue } from "./domain.ts";

export interface ComparativeApplication {
  run(arguments_: readonly string[]): Promise<number>;
}

export const CAPSTONE_IMPLEMENTATION: CapstoneImplementation = "solution";
export const SPEC_VERSION = "1.0.0";

export function createApplication(): ComparativeApplication {
  return {
    async run(arguments_) {
      const result = runProcess(arguments_);
      process.stdout.write(`${JSON.stringify(result.envelope)}\n`);
      return result.exitCode;
    },
  };
}

export function main(arguments_: readonly string[]): Promise<number> {
  return createApplication().run(arguments_);
}
