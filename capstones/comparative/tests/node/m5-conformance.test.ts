import test from "node:test";

import { runMultiprocessFixture } from "../support/conformance.ts";

test(
  "milestone 5 passes every real subprocess race, busy, and cleanup fixture",
  { timeout: 300_000 },
  async () => {
    await runMultiprocessFixture();
  },
);
