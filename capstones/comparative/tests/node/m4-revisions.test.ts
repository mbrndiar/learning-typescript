import test from "node:test";

import { runSequentialFixture, solutionTestsEnabled } from "../support/conformance.ts";

test(
  "milestone 4 enforces global revisions, CAS, exhaustion, and binary order",
  { skip: !solutionTestsEnabled(), timeout: 180_000 },
  async () => {
    await runSequentialFixture("scenarios/boundary.json");
  },
);
