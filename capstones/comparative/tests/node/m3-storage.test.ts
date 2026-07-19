import test from "node:test";

import {
  assertV1StorageInvariants,
  runSequentialFixture,
} from "../support/conformance.ts";

test(
  "milestone 3 initializes, validates, migrates, and rolls back SQLite storage",
  { timeout: 180_000 },
  async () => {
    await runSequentialFixture("scenarios/normal.json");
    await runSequentialFixture("scenarios/migration.json");
    await assertV1StorageInvariants();
  },
);
