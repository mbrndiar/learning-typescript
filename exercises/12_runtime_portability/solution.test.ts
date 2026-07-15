import assert from "node:assert/strict";
import test from "node:test";

import { describeCapabilities } from "./solution.ts";

test("describeCapabilities reports explicit runtime differences", () => {
  assert.equal(
    describeCapabilities({
      runtime: "Deno",
      permissions: true,
      nodeSqlite: false,
    }),
    "Deno: explicit permissions; node:sqlite unavailable",
  );
  assert.equal(
    describeCapabilities({
      runtime: "Node.js",
      permissions: false,
      nodeSqlite: true,
    }),
    "Node.js: process authority; node:sqlite available",
  );
});
