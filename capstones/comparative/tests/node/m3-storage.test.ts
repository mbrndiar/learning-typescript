import test from "node:test";

import {
  assertV1StorageInvariants,
  runSequentialFixture,
  solutionTestsEnabled,
} from "../support/conformance.ts";

const skip = !solutionTestsEnabled();

test(
  "milestone 3 initializes, validates, migrates, and rolls back SQLite storage",
  { skip, timeout: 180_000 },
  async () => {
    await runSequentialFixture("scenarios/normal.json");
    await runSequentialFixture("scenarios/migration.json");
    await assertV1StorageInvariants();
  },
);
