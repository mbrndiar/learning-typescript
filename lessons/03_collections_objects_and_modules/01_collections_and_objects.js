import { log } from "node:console";

const originalNames = ["Ada", "Lin", "Grace"];
const names = [...originalNames, "Edsger"];
const [firstName, secondName, ...remainingNames] = names;

const learner = {
  id: "learner-1",
  name: firstName,
  active: true,
};
const learnerWithLevel = { ...learner, level: "beginner" };
const { id, name } = learnerWithLevel;

const visitsByLearner = new Map([
  [id, 2],
  ["learner-2", 1],
]);
const uniqueNames = new Set(names);

function sum(...values) {
  let total = 0;

  for (const value of values) {
    total += value;
  }

  return total;
}

export function describeLearner(value) {
  return `${value.name} (${value.id})`;
}

log(`First: ${firstName}; second: ${secondName}`);
log(`Remaining: ${remainingNames.join(", ")}`);
log(`${name} has ID ${id}`);
log(describeLearner(learnerWithLevel));
log(`Visits: ${visitsByLearner.get(id)}`);
log(`Unique names: ${uniqueNames.size}`);
log(`Sum: ${sum(2, 4, 6)}`);
