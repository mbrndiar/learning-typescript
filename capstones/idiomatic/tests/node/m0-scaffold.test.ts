import assert from "node:assert/strict";
import test from "node:test";

import { selectCapstoneImplementation } from "../../../shared/harness.ts";
import {
  assertSameIdiomaticBoundary,
  runIdiomaticScaffoldContract,
} from "../contracts/scaffold.ts";
import {
  loadNodeIdiomaticTarget,
  selectedNodeImplementation,
} from "./implementation.ts";

test("Node idiomatic target selection is explicit and validated", () => {
  assert.equal(selectCapstoneImplementation(undefined), "starter");
  assert.equal(selectCapstoneImplementation("solution"), "solution");
  assert.equal(
    selectedNodeImplementation(),
    selectCapstoneImplementation(process.env.CAPSTONE_IMPLEMENTATION),
  );
  assert.throws(() => selectCapstoneImplementation("complete"), /starter or solution/);
});

test("Node imports both idiomatic targets through one shared contract", async () => {
  const [starter, solution] = await Promise.all([
    loadNodeIdiomaticTarget("starter"),
    loadNodeIdiomaticTarget("solution"),
  ]);

  assertSameIdiomaticBoundary(
    starter.core,
    solution.core,
    starter.adapter,
    solution.adapter,
  );
  await runIdiomaticScaffoldContract(
    starter.implementation,
    "node",
    starter.core,
    starter.adapter,
  );
  await runIdiomaticScaffoldContract(
    solution.implementation,
    "node",
    solution.core,
    solution.adapter,
  );
});
