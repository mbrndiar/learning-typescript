import { test } from "bun:test";

import { runM5ConformanceContract } from "../contracts/m5-conformance.ts";
import { loadBunIdiomaticTarget, selectedBunImplementation } from "./implementation.ts";

test("m5-conformance: Bun shared fixture semantics", async () => {
  const target = await loadBunIdiomaticTarget(selectedBunImplementation());
  await runM5ConformanceContract("bun", target.implementation, target.core, {
    readText: (path) => Bun.file(path).text(),
  });
});
