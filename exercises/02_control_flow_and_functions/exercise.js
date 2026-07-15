export function classifyScore(score) {
  // TODO: Return one of the three required labels.
  return `score:${score}`;
}

export function sumTo(limit) {
  // TODO: Use a loop and an accumulator.
  return limit;
}

export function createCounter(start) {
  // TODO: Keep a changing count in the surrounding function's scope.
  return function next() {
    return start;
  };
}
