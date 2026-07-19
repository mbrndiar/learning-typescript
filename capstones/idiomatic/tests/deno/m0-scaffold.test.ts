import {
  assertSameIdiomaticBoundary,
  runIdiomaticScaffoldContract,
} from "../contracts/scaffold.ts";
import { loadDenoIdiomaticTarget, selectedDenoImplementation } from "./implementation.ts";

Deno.test({
  name: "Deno idiomatic target selection reads only its named environment variable",
  permissions: { env: ["CAPSTONE_IMPLEMENTATION"] },
  fn: () => {
    const expected = Deno.env.get("CAPSTONE_IMPLEMENTATION") ?? "solution";
    if (selectedDenoImplementation() !== expected) {
      throw new Error("Deno capstone target selection returned an unexpected target");
    }
  },
});

Deno.test({
  name: "Deno imports both idiomatic targets through one shared contract",
  permissions: { read: false, write: false, net: false, env: false, run: false },
  fn: async () => {
    const [starter, solution] = await Promise.all([
      loadDenoIdiomaticTarget("starter"),
      loadDenoIdiomaticTarget("solution"),
    ]);

    assertSameIdiomaticBoundary(
      starter,
      solution,
    );
    runIdiomaticScaffoldContract(starter, "deno");
    runIdiomaticScaffoldContract(solution, "deno");
  },
});
