import { runM1DomainContract } from "../contracts/m1-domain.ts";
import { loadDenoIdiomaticTarget, selectedDenoImplementation } from "./implementation.ts";

Deno.test({
  name: "m1-domain: portable event domain",
  permissions: { env: ["CAPSTONE_IMPLEMENTATION"] },
  async fn() {
    const target = await loadDenoIdiomaticTarget(selectedDenoImplementation());
    await runM1DomainContract(target.core);
  },
});
