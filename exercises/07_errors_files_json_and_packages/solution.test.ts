import assert from "node:assert/strict";
import test from "node:test";

import { selectExerciseTarget } from "../test-target.ts";

const implementation =
  selectExerciseTarget(process.env.EXERCISE_IMPLEMENTATION) === "exercise"
    ? await import("./exercise.ts")
    : await import("./solution.ts");
const { normalizeTimestamp, parseTasks } = implementation;

test("parseTasks validates and normalizes tasks", () => {
  // Whitespace in the fixture shows validation can also normalize trusted
  // output, not merely accept or reject input.
  assert.deepEqual(
    parseTasks([{ id: 1, title: "  Learn boundaries  ", done: false }]),
    [{ id: 1, title: "Learn boundaries", done: false }],
  );
});

test("parseTasks rejects malformed input", () => {
  // These cases fail at different boundary layers: container shape, numeric
  // invariant, and a string that is present but semantically empty.
  assert.throws(() => parseTasks({}), /array/);
  assert.throws(
    () => parseTasks([{ id: 0, title: "Invalid", done: false }]),
    /positive integer/,
  );
  assert.throws(() => parseTasks([{ id: 1, title: " ", done: false }]), /non-empty/);
});

test("normalizeTimestamp validates calendar fields and emits canonical UTC", () => {
  assert.equal(
    normalizeTimestamp("2026-07-16T10:01:00+02:00"),
    "2026-07-16T08:01:00.000Z",
  );
  assert.equal(normalizeTimestamp("2024-02-29T00:00:00Z"), "2024-02-29T00:00:00.000Z");
  assert.throws(() => normalizeTimestamp("2026-02-29T00:00:00Z"), /calendar/);
  assert.throws(() => normalizeTimestamp("2026-01-01T24:00:00Z"), /calendar/);
  assert.throws(() => normalizeTimestamp("July 16, 2026"), /RFC 3339/);
});
