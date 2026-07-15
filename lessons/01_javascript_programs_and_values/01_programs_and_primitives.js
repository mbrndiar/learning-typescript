import { log } from "node:console";

const learnerName = "Mina";
const lessonsInModule = 2;
const isReady = true;
let completedLessons = 0;
const nextTopic = undefined;
const optionalNote = null;

log(`Welcome, ${learnerName}!`);
log(`Lessons available: ${lessonsInModule}`);
log(`Ready to begin: ${isReady}`);
log(`Next topic: ${nextTopic}`);
log(`Optional note: ${optionalNote}`);

completedLessons = completedLessons + 1;
log(`Lessons completed: ${completedLessons}`);

log(typeof learnerName);
log(typeof lessonsInModule);
log(typeof isReady);
