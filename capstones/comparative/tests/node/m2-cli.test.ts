import test from "node:test";

import {
  assertAdditionalCliGrammar,
  runSequentialFixture,
} from "../support/conformance.ts";

test(
  "milestone 2 implements the exact CLI, envelopes, and validation precedence",
  { timeout: 120_000 },
  async () => {
    await runSequentialFixture("scenarios/invalid.json");
    await assertAdditionalCliGrammar();
  },
);
