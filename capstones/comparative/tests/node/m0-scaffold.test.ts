import assert from "node:assert/strict";
import test from "node:test";

import { selectCapstoneImplementation } from "../../../shared/harness.ts";
import {
  assertSameComparativeBoundary,
  assertSolutionScaffoldContract,
  runStarterScaffoldContract,
} from "../contracts/scaffold.ts";
import {
  loadComparativeTarget,
  selectedComparativeImplementation,
} from "../support/implementation.ts";

test("comparative target selection is explicit and validated", () => {
  assert.equal(selectCapstoneImplementation(undefined), "starter");
  assert.equal(selectCapstoneImplementation("solution"), "solution");
  assert.equal(
    selectedComparativeImplementation(),
    selectCapstoneImplementation(process.env.CAPSTONE_IMPLEMENTATION),
  );
  assert.throws(() => selectCapstoneImplementation("complete"), /starter or solution/);
});

test("comparative starter remains guided while solution keeps the same boundary", async () => {
  const [starter, solution] = await Promise.all([
    loadComparativeTarget("starter"),
    loadComparativeTarget("solution"),
  ]);

  assertSameComparativeBoundary(
    starter.module,
    solution.module,
    starter.entry,
    solution.entry,
  );
  await runStarterScaffoldContract(starter.module, starter.entry);
  assertSolutionScaffoldContract(solution.module, solution.entry);
});
