// This lesson shows the everyday collections (arrays, objects, Map, Set) and
// the ... syntax, which does two opposite jobs: spread copies existing values
// into a new array/object, while rest gathers many values into one.

const originalNames = ["Ada", "Lin", "Grace"];
// Spread builds a new array; originalNames is left untouched. Copying instead
// of mutating keeps each value's owner clear.
const names = [...originalNames, "Edsger"];
// Destructuring names selected positions; ...remainingNames gathers whatever
// is left into its own array.
const [firstName, secondName, ...remainingNames] = names;

const learner = {
  id: "learner-1",
  name: firstName,
  active: true,
};
// Object spread makes a shallow copy plus the added property; learner itself
// does not change.
const learnerWithLevel = { ...learner, level: "beginner" };
const { id, name } = learnerWithLevel;

// A Map keeps explicit key/value pairs (keys may be any type) and is queried
// with get; a Set stores each value only once, which is why its size reflects
// unique names rather than the array length.
const visitsByLearner = new Map([
  [id, 2],
  ["learner-2", 1],
]);
const uniqueNames = new Set(names);

// Here ... is rest in a parameter list: it collects any number of arguments
// into a single array the function can iterate.
function sum(...values) {
  let total = 0;

  for (const value of values) {
    total += value;
  }

  return total;
}

// Exported so the next lesson can import it and demonstrate modules; it turns
// any learner-shaped value into a display string.
export function describeLearner(value) {
  return `${value.name} (${value.id})`;
}

console.log(`First: ${firstName}; second: ${secondName}`);
console.log(`Remaining: ${remainingNames.join(", ")}`);
console.log(`${name} has ID ${id}`);
console.log(describeLearner(learnerWithLevel));
console.log(`Visits: ${visitsByLearner.get(id)}`);
console.log(`Unique names: ${uniqueNames.size}`);
console.log(`Sum: ${sum(2, 4, 6)}`);
