import { readFile } from "node:fs/promises";
import test from "node:test";

import { runM5ConformanceContract } from "../contracts/m5-conformance.ts";

test("m5-conformance: Node shared fixture semantics", () =>
  runM5ConformanceContract("node", {
    readText: (path) => readFile(path, "utf8"),
  }));
