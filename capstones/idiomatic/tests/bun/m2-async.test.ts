import { test } from "bun:test";

import { runM2AsyncContract } from "../contracts/m2-async.ts";
import { loadBunIdiomaticTarget, selectedBunImplementation } from "./implementation.ts";

test("m2-async: bounded portable async boundary", async () => {
  const target = await loadBunIdiomaticTarget(selectedBunImplementation());
  await runM2AsyncContract(target.core);
});
