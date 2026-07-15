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

let total = 0;

for (let number = 1; number <= 4; number += 1) {
  total += number;
}

console.log(`1 + 2 + 3 + 4 = ${total}`);

let countdown = 3;

while (countdown > 0) {
  console.log(`Starting in ${countdown}`);
  countdown -= 1;
}

console.log("Go!");
