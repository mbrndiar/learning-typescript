const learnerName = "Mina";
const lessonsInModule = 2;
const isReady = true;
let completedLessons = 0;
const nextTopic = undefined;
const optionalNote = null;

console.log(`Welcome, ${learnerName}!`);
console.log(`Lessons available: ${lessonsInModule}`);
console.log(`Ready to begin: ${isReady}`);
console.log(`Next topic: ${nextTopic}`);
console.log(`Optional note: ${optionalNote}`);

completedLessons = completedLessons + 1;
console.log(`Lessons completed: ${completedLessons}`);

console.log(typeof learnerName);
console.log(typeof lessonsInModule);
console.log(typeof isReady);
