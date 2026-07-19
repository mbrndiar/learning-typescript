import { readFile } from "node:fs/promises";
import test from "node:test";

import { runM5ConformanceContract } from "../contracts/m5-conformance.ts";
import {
  loadNodeIdiomaticTarget,
  selectedNodeImplementation,
} from "./implementation.ts";

test("m5-conformance: Node shared fixture semantics", async () => {
  const target = await loadNodeIdiomaticTarget(selectedNodeImplementation());
  await runM5ConformanceContract("node", target.implementation, target.core, {
    readText: (path) => readFile(path, "utf8"),
  });
});
