import test from "node:test";

import { runM2AsyncContract } from "../contracts/m2-async.ts";
import {
  loadNodeIdiomaticTarget,
  selectedNodeImplementation,
} from "./implementation.ts";

test("m2-async: bounded portable async boundary", async () => {
  const target = await loadNodeIdiomaticTarget(selectedNodeImplementation());
  await runM2AsyncContract(target.core);
});
