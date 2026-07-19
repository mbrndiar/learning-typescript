import { test } from "bun:test";

import { runM4HttpContract } from "../contracts/m4-http.ts";
import { loadBunIdiomaticTarget, selectedBunImplementation } from "./implementation.ts";

test("m4-http: Bun loopback relay service", async () => {
  const target = await loadBunIdiomaticTarget(selectedBunImplementation());
  await runM4HttpContract(target.core, target.serve);
});
