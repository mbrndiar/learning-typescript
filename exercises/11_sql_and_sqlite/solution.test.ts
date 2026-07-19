import assert from "node:assert/strict";
import test from "node:test";

import { selectExerciseTarget } from "../test-target.ts";

const implementation =
  selectExerciseTarget(process.env.EXERCISE_IMPLEMENTATION) === "exercise"
    ? await import("./exercise.ts")
    : await import("./solution.ts");
const { openTaskRepository } = implementation;

test("SQLite repository binds, normalizes, and returns task rows", () => {
  const repository = openTaskRepository();
  try {
    assert.deepEqual(repository.create("  Learn parameter binding  "), {
      id: 1,
      title: "Learn parameter binding",
      done: false,
    });
    assert.deepEqual(repository.create("Commit related writes"), {
      id: 2,
      title: "Commit related writes",
      done: false,
    });
    assert.deepEqual(repository.list(), [
      { id: 1, title: "Learn parameter binding", done: false },
      { id: 2, title: "Commit related writes", done: false },
    ]);
    assert.throws(() => repository.create("   "), /non-empty/);
  } finally {
    repository.close();
  }
});

test("SQLite repository closes native resources deterministically", () => {
  const repository = openTaskRepository();
  repository.close();
  repository.close();
  assert.throws(() => repository.list(), /closed/);
});
