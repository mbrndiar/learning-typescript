import { runM1DomainContract } from "../contracts/m1-domain.ts";

Deno.test({
  name: "m1-domain: portable event domain",
  permissions: "none",
  fn: runM1DomainContract,
});
