import { runM2AsyncContract } from "../contracts/m2-async.ts";
import { loadDenoIdiomaticTarget, selectedDenoImplementation } from "./implementation.ts";

Deno.test({
  name: "m2-async: bounded portable async boundary",
  permissions: { env: ["CAPSTONE_IMPLEMENTATION"] },
  async fn() {
    const target = await loadDenoIdiomaticTarget(selectedDenoImplementation());
    await runM2AsyncContract(target.core);
  },
});
