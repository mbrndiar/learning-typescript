import assert from "node:assert/strict";
import test from "node:test";

import { buildPurchaseSummary } from "./solution.js";

test("converts quantity text and calculates a purchase total", () => {
  assert.equal(buildPurchaseSummary("Pen", 2.5, "3"), "3 × Pen at $2.50 = $7.50");
});

// Guards the formatting contract at the edges: a zero total must still read
// "$0.00" and a whole-number price "$4.00", which only holds if toFixed(2) is
// applied rather than raw number-to-string conversion.
test("formats zero and multi-digit totals consistently", () => {
  assert.equal(
    buildPurchaseSummary("Notebook", 6.25, "0"),
    "0 × Notebook at $6.25 = $0.00",
  );
  assert.equal(
    buildPurchaseSummary("Folder", 4, "12"),
    "12 × Folder at $4.00 = $48.00",
  );
});
