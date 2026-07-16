import { runM5ConformanceContract } from "../contracts/m5-conformance.ts";

Deno.test({
  name: "m5-conformance: Deno shared fixture semantics",
  permissions: {
    read: ["capstones/idiomatic/tests/fixtures"],
  },
  fn: () =>
    runM5ConformanceContract("deno", {
      readText: Deno.readTextFile,
    }),
});
