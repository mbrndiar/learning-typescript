import test from "node:test";

import {
  assertDomainFixtures,
  runDomainCliFixtures,
  solutionTestsEnabled,
} from "../support/conformance.ts";

const skip = !solutionTestsEnabled();

test(
  "milestone 1 validates and normalizes every domain fixture",
  { skip },
  async () => {
    await assertDomainFixtures();
  },
);

test(
  "milestone 1 rejects invalid domain input before creating SQLite storage",
  { skip, timeout: 120_000 },
  async () => {
    await runDomainCliFixtures();
  },
);
