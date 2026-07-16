import test from "node:test";

import { runM1DomainContract } from "../contracts/m1-domain.ts";

test("m1-domain: portable event domain", runM1DomainContract);
