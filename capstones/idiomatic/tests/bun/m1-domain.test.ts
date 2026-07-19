import { test } from "bun:test";

import { runM1DomainContract } from "../contracts/m1-domain.ts";
import { loadBunIdiomaticTarget, selectedBunImplementation } from "./implementation.ts";

test("m1-domain: portable event domain", async () => {
  const target = await loadBunIdiomaticTarget(selectedBunImplementation());
  await runM1DomainContract(target.core);
});
