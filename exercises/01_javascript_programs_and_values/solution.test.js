import assert from "node:assert/strict";
import test from "node:test";

const target = globalThis.process.env.EXERCISE_IMPLEMENTATION ?? "solution";
if (target !== "exercise" && target !== "solution") {
  throw new TypeError("EXERCISE_IMPLEMENTATION must be exercise or solution");
}
const { buildPurchaseSummary } =
  target === "exercise" ? await import("./exercise.js") : await import("./solution.js");

test("converts quantity text and calculates a purchase total", () => {
  assert.equal(buildPurchaseSummary("Pen", 250, "3"), "3 × Pen at $2.50 = $7.50");
});

// Guards the formatting contract at the edges: a zero total must still read
// "$0.00" and a whole-number price "$4.00", which only holds if toFixed(2) is
// applied rather than raw number-to-string conversion.
test("formats zero and multi-digit totals consistently", () => {
  assert.equal(
    buildPurchaseSummary("Notebook", 625, "0"),
    "0 × Notebook at $6.25 = $0.00",
  );
  assert.equal(
    buildPurchaseSummary("Folder", 400, "12"),
    "12 × Folder at $4.00 = $48.00",
  );
  assert.equal(
    buildPurchaseSummary("Marker", 999, "3"),
    "3 × Marker at $9.99 = $29.97",
  );
});
