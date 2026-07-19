import assert from "node:assert/strict";
import test from "node:test";

import { selectExerciseTarget } from "../test-target.ts";

const implementation =
  selectExerciseTarget(process.env.EXERCISE_IMPLEMENTATION) === "exercise"
    ? await import("./exercise.ts")
    : await import("./solution.ts");
const { retry } = implementation;

test("retry returns after a later success", async () => {
  // The operation fails twice to prove retry counts attempts across async
  // boundaries instead of only wrapping the first promise.
  let calls = 0;
  const result = await retry(
    async () => {
      calls += 1;
      if (calls < 3) {
        throw new Error("temporary");
      }
      return "ready";
    },
    3,
    () => true,
  );

  assert.equal(result, "ready");
  assert.equal(calls, 3);
});

test("retry preserves a non-retryable error", async () => {
  // Identity matters here: callers may branch on the exact typed error they
  // created, so retry must not wrap or replace it.
  const failure = new TypeError("invalid input");
  await assert.rejects(
    retry(
      async () => {
        throw failure;
      },
      3,
      (error) => !(error instanceof TypeError),
    ),
    (error) => error === failure,
  );
});

test("retry validates the attempt count", async () => {
  // Invalid configuration should fail before the operation runs, making the
  // retry boundary deterministic and safe to call.
  await assert.rejects(
    retry(
      async () => "unused",
      0,
      () => true,
    ),
    RangeError,
  );
});
