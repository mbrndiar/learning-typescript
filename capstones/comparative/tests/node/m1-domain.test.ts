import test from "node:test";

import {
  assertFrozenFixtureIntegrity,
  runDomainCliFixtures,
} from "../support/conformance.ts";

test("milestone 1 preserves the frozen domain fixture contract", async () => {
  await assertFrozenFixtureIntegrity();
});

test(
  "milestone 1 rejects invalid domain input before creating SQLite storage",
  { timeout: 120_000 },
  async () => {
    await runDomainCliFixtures();
  },
);
