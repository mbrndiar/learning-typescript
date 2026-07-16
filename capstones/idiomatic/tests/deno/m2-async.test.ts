import { runM2AsyncContract } from "../contracts/m2-async.ts";

Deno.test({
  name: "m2-async: bounded portable async boundary",
  permissions: "none",
  fn: runM2AsyncContract,
});
