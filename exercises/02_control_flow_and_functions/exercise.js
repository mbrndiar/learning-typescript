// Contract: return exactly one of "excellent", "passed", or "practice".
// Order the checks from highest threshold down so the first match wins.
export function classifyScore(score) {
  // TODO: Return one of the three required labels.
  return `score:${score}`;
}

// Contract: return 1 + 2 + ... + limit (0 when limit is 0). Accumulate in a
// running total rather than a formula so the loop pattern is practiced.
export function sumTo(limit) {
  // TODO: Use a loop and an accumulator.
  return limit;
}

// Contract: each call to createCounter returns an independent counter whose
// count survives between calls. Keep the count in the enclosing scope so the
// returned function closes over it.
export function createCounter(start) {
  // TODO: Keep a changing count in the surrounding function's scope.
  return function next() {
    return start;
  };
}
