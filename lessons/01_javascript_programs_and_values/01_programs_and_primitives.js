// This program runs top to bottom when Node.js reads the file. It shows the
// primitive value types you use most, and the difference between a `const`
// binding (the name always refers to the same value) and a `let` binding
// (the name may be reassigned later).
const learnerName = "Mina";
const lessonsInModule = 2;
const isReady = true;
// completedLessons uses `let` because it is assigned a new value later; prefer
// `const` by default and reach for `let` only when reassignment is required.
let completedLessons = 0;
// undefined and null both signal "no value" but by convention differ:
// undefined usually means "not set yet", null means "intentionally empty".
const nextTopic = undefined;
const optionalNote = null;

console.log(`Welcome, ${learnerName}!`);
console.log(`Lessons available: ${lessonsInModule}`);
console.log(`Ready to begin: ${isReady}`);
// A template literal converts whatever it interpolates into text, so
// undefined and null appear as the literal words "undefined" and "null".
console.log(`Next topic: ${nextTopic}`);
console.log(`Optional note: ${optionalNote}`);

completedLessons = completedLessons + 1;
console.log(`Lessons completed: ${completedLessons}`);

// typeof reports the type as a string at runtime. JavaScript tracks types on
// values, not on names, which is exactly the dynamism TypeScript adds static
// checks on top of starting in module 4.
console.log(typeof learnerName);
console.log(typeof lessonsInModule);
console.log(typeof isReady);
