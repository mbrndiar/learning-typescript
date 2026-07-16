import { expect, test } from "bun:test";

import { selectCapstoneImplementation } from "../../../shared/harness.ts";
import {
  assertSameIdiomaticBoundary,
  runIdiomaticScaffoldContract,
} from "../contracts/scaffold.ts";
import { loadBunIdiomaticTarget, selectedBunImplementation } from "./implementation.ts";

test("Bun idiomatic target selection is explicit and validated", () => {
  expect(selectCapstoneImplementation(undefined)).toBe("starter");
  expect(selectCapstoneImplementation("solution")).toBe("solution");
  expect(selectedBunImplementation()).toBe(
    selectCapstoneImplementation(Bun.env.CAPSTONE_IMPLEMENTATION),
  );
  expect(() => selectCapstoneImplementation("complete")).toThrow(/starter or solution/);
});

test("Bun imports both idiomatic targets through one shared contract", async () => {
  const [starter, solution] = await Promise.all([
    loadBunIdiomaticTarget("starter"),
    loadBunIdiomaticTarget("solution"),
  ]);

  assertSameIdiomaticBoundary(
    starter.core,
    solution.core,
    starter.adapter,
    solution.adapter,
  );
  await runIdiomaticScaffoldContract(
    starter.implementation,
    "bun",
    starter.core,
    starter.adapter,
  );
  await runIdiomaticScaffoldContract(
    solution.implementation,
    "bun",
    solution.core,
    solution.adapter,
  );
});
