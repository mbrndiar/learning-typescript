// Reference solution. classifyScore checks thresholds high-to-low so the first
// satisfied condition wins; createCounter stores count in the closure so each
// counter keeps private, persistent state.
export function classifyScore(score) {
  if (score >= 90) {
    return "excellent";
  }

  if (score >= 70) {
    return "passed";
  }

  return "practice";
}

export function sumTo(limit) {
  let total = 0;

  for (let number = 1; number <= limit; number += 1) {
    total += number;
  }

  return total;
}

export function createCounter(start) {
  let count = start;

  return function next() {
    count += 1;
    return count;
  };
}
