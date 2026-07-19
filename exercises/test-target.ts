export type ExerciseTarget = "exercise" | "solution";

export function selectExerciseTarget(value: string | undefined): ExerciseTarget {
  const target = value ?? "solution";
  if (target !== "exercise" && target !== "solution") {
    throw new TypeError("EXERCISE_IMPLEMENTATION must be exercise or solution");
  }
  return target;
}
