import { runM5ConformanceContract } from "../contracts/m5-conformance.ts";
import { loadDenoIdiomaticTarget, selectedDenoImplementation } from "./implementation.ts";

Deno.test({
  name: "m5-conformance: Deno shared fixture semantics",
  permissions: {
    read: ["capstones/idiomatic/tests/fixtures"],
    env: ["CAPSTONE_IMPLEMENTATION"],
  },
  async fn() {
    const target = await loadDenoIdiomaticTarget(selectedDenoImplementation());
    await runM5ConformanceContract("deno", target.implementation, target.core, {
      readText: Deno.readTextFile,
    });
  },
});
