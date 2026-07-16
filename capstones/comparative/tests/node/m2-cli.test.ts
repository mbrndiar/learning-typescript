import test from "node:test";

import {
  assertAdditionalCliGrammar,
  runSequentialFixture,
  solutionTestsEnabled,
} from "../support/conformance.ts";

const skip = !solutionTestsEnabled();

test(
  "milestone 2 implements the exact CLI, envelopes, and validation precedence",
  { skip, timeout: 120_000 },
  async () => {
    await runSequentialFixture("scenarios/invalid.json");
    await assertAdditionalCliGrammar();
  },
);
