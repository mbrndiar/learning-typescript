import test from "node:test";

import { runM4HttpContract } from "../contracts/m4-http.ts";
import {
  loadNodeIdiomaticTarget,
  selectedNodeImplementation,
} from "./implementation.ts";

test("m4-http: Node loopback relay service", async () => {
  const target = await loadNodeIdiomaticTarget(selectedNodeImplementation());
  await runM4HttpContract(target.core, target.serve);
});
