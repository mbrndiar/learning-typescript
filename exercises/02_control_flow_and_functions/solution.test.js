import assert from "node:assert/strict";
import test from "node:test";

const target = globalThis.process.env.EXERCISE_IMPLEMENTATION ?? "solution";
if (target !== "exercise" && target !== "solution") {
  throw new TypeError("EXERCISE_IMPLEMENTATION must be exercise or solution");
}
const { classifyScore, createCounter, sumTo } =
  target === "exercise" ? await import("./exercise.js") : await import("./solution.js");

// Checks the exact boundary values (69/70, 89/90) because off-by-one errors in
// the >= thresholds are the most likely mistake.
test("classifies score boundaries", () => {
  assert.equal(classifyScore(69), "practice");
  assert.equal(classifyScore(70), "passed");
  assert.equal(classifyScore(89), "passed");
  assert.equal(classifyScore(90), "excellent");
});

test("sums integers through the given limit", () => {
  assert.equal(sumTo(0), 0);
  assert.equal(sumTo(1), 1);
  assert.equal(sumTo(5), 15);
});

// Interleaves calls to two counters to prove each closure owns a separate
// count: advancing `first` must not affect `second`.
test("creates independent counters that remember their state", () => {
  const first = createCounter(10);
  const second = createCounter(0);

  assert.equal(first(), 11);
  assert.equal(first(), 12);
  assert.equal(second(), 1);
  assert.equal(first(), 13);
});
