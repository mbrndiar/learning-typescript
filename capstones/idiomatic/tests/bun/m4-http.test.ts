import { test } from "bun:test";

import { serveBunRelay } from "../../solution/bun/runtime.ts";
import { runM4HttpContract } from "../contracts/m4-http.ts";

test("m4-http: Bun loopback relay service", () => runM4HttpContract(serveBunRelay));
