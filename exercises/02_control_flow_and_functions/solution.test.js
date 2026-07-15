import assert from "node:assert/strict";
import test from "node:test";

import { classifyScore, createCounter, sumTo } from "./solution.js";

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

test("creates independent counters that remember their state", () => {
  const first = createCounter(10);
  const second = createCounter(0);

  assert.equal(first(), 11);
  assert.equal(first(), 12);
  assert.equal(second(), 1);
  assert.equal(first(), 13);
});
