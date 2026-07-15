import assert from "node:assert/strict";
import test from "node:test";

import { mapWithLimit } from "./solution.ts";

test("mapWithLimit preserves order and bounds concurrency", async () => {
  let active = 0;
  let maximumActive = 0;

  // Durations finish out of order; the expected result proves output order is
  // based on input position, while maximumActive proves the limit was honored.
  const results = await mapWithLimit([30, 10, 20, 5], 2, async (milliseconds) => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
    active -= 1;
    return milliseconds / 5;
  });

  assert.deepEqual(results, [6, 2, 4, 1]);
  assert.equal(maximumActive, 2);
});

test("mapWithLimit validates the limit", async () => {
  // A zero limit would create no workers and a promise that can never make
  // progress, so it must fail synchronously through the returned promise.
  await assert.rejects(
    mapWithLimit([1], 0, async (value) => value),
    RangeError,
  );
});

test("mapWithLimit transforms an undefined element", async () => {
  // Regression check: "no more work" must be distinguished from a real input
  // element whose value is undefined.
  let calls = 0;
  const result = await mapWithLimit([undefined], 1, async (value) => {
    calls += 1;
    return value === undefined ? "missing" : "present";
  });

  assert.deepEqual(result, ["missing"]);
  assert.equal(calls, 1);
});
