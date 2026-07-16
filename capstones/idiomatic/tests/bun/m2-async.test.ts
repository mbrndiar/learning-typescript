import { test } from "bun:test";

import { runM2AsyncContract } from "../contracts/m2-async.ts";

test("m2-async: bounded portable async boundary", runM2AsyncContract);
