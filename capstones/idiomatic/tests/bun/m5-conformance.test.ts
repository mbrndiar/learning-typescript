import { test } from "bun:test";

import { runM5ConformanceContract } from "../contracts/m5-conformance.ts";

test("m5-conformance: Bun shared fixture semantics", () =>
  runM5ConformanceContract("bun", {
    readText: (path) => Bun.file(path).text(),
  }));
