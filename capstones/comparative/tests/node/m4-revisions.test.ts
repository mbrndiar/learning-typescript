import test from "node:test";

import { runSequentialFixture } from "../support/conformance.ts";

test(
  "milestone 4 enforces global revisions, CAS, exhaustion, and binary order",
  { timeout: 180_000 },
  async () => {
    await runSequentialFixture("scenarios/boundary.json");
  },
);
