import assert from "node:assert/strict";
import test from "node:test";

import { formatReading, readTemperature, toFahrenheit } from "./solution.ts";

test("converts Celsius to Fahrenheit", () => {
  assert.equal(toFahrenheit(0), 32);
  assert.equal(toFahrenheit(100), 212);
});

test("narrows unknown numeric input", () => {
  // These cases cover the trust boundary: real numbers, numeric text, blank
  // text, non-numeric text, non-finite numbers, and non-number values.
  assert.equal(readTemperature(12.5), 12.5);
  assert.equal(readTemperature(" 8 "), 8);
  assert.equal(readTemperature(""), undefined);
  assert.equal(readTemperature("cold"), undefined);
  assert.equal(readTemperature(Number.POSITIVE_INFINITY), undefined);
  assert.equal(readTemperature(null), undefined);
});

test("formats a typed reading", () => {
  assert.equal(formatReading(["Oslo", 10]), "Oslo: 10.0°C / 50.0°F");
});
