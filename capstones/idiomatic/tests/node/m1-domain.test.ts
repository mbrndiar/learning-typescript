import test from "node:test";

import { runM1DomainContract } from "../contracts/m1-domain.ts";
import {
  loadNodeIdiomaticTarget,
  selectedNodeImplementation,
} from "./implementation.ts";

test("m1-domain: portable event domain", async () => {
  const target = await loadNodeIdiomaticTarget(selectedNodeImplementation());
  await runM1DomainContract(target.core);
});
