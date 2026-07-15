import assert from "node:assert/strict";
import test from "node:test";

import { retry } from "./solution.ts";

test("retry returns after a later success", async () => {
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
  await assert.rejects(
    retry(
      async () => "unused",
      0,
      () => true,
    ),
    RangeError,
  );
});
