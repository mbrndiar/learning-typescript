import assert from "node:assert/strict";
import test from "node:test";

function clamp(value: number, minimum: number, maximum: number): number {
  if (minimum > maximum) {
    throw new RangeError("minimum must not exceed maximum");
  }
  return Math.min(maximum, Math.max(minimum, value));
}

const cases = [
  { name: "keeps a value in range", value: 5, expected: 5 },
  { name: "raises a low value", value: -2, expected: 0 },
  { name: "lowers a high value", value: 14, expected: 10 },
] as const;

for (const example of cases) {
  test(example.name, () => {
    assert.equal(clamp(example.value, 0, 10), example.expected);
  });
}

test("rejects an inverted range", () => {
  assert.throws(() => clamp(5, 10, 0), RangeError);
});
