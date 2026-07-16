import test from "node:test";

import { serveNodeRelay } from "../../solution/node/runtime.ts";
import { runM4HttpContract } from "../contracts/m4-http.ts";

test("m4-http: Node loopback relay service", () => runM4HttpContract(serveNodeRelay));
