// This lesson shows how a program chooses which statements to run. An
// if/else-if chain is checked top to bottom and stops at the first branch
// whose condition is truthy, so order matters: the wider `>= 70` test must
// come after the stricter `>= 90` test.
const score = 84;
let result;

if (score >= 90) {
  result = "excellent";
} else if (score >= 70) {
  result = "passed";
} else {
  result = "keep practicing";
}

console.log(`Result: ${result}`);

// A `for` loop suits a known number of repetitions: the counter is set up,
// tested, and advanced in one place.
let total = 0;

for (let number = 1; number <= 4; number += 1) {
  total += number;
}

console.log(`1 + 2 + 3 + 4 = ${total}`);

// A `while` loop runs as long as its condition holds, so the body must make
// progress toward stopping (here, by decrementing) or it would loop forever.
let countdown = 3;

while (countdown > 0) {
  console.log(`Starting in ${countdown}`);
  countdown -= 1;
}

console.log("Go!");
