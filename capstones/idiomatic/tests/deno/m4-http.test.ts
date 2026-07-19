import { runM4HttpContract } from "../contracts/m4-http.ts";
import { loadDenoIdiomaticTarget, selectedDenoImplementation } from "./implementation.ts";

Deno.test({
  name: "m4-http: Deno loopback relay service",
  permissions: { net: ["127.0.0.1"], env: ["CAPSTONE_IMPLEMENTATION"] },
  async fn() {
    const target = await loadDenoIdiomaticTarget(selectedDenoImplementation());
    await runM4HttpContract(target.core, target.serve);
  },
});
