import test from "node:test";

import {
  runMultiprocessFixture,
  solutionTestsEnabled,
} from "../support/conformance.ts";

test(
  "milestone 5 passes every real subprocess race, busy, and cleanup fixture",
  { skip: !solutionTestsEnabled(), timeout: 300_000 },
  async () => {
    await runMultiprocessFixture();
  },
);
