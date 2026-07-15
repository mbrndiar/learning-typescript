import { describeLearner } from "./01_collections_and_objects.js";

const learners = [
  { id: "learner-1", name: "Ada" },
  { id: "learner-2", name: "Lin" },
];

function findLearnerById(id) {
  for (const learner of learners) {
    if (learner.id === id) {
      return learner;
    }
  }

  throw new Error(`Unknown learner: ${id}`);
}

const foundLearner = findLearnerById("learner-2");
console.log(describeLearner(foundLearner));

try {
  findLearnerById("learner-9");
} catch (error) {
  if (error instanceof Error) {
    console.log(`Could not find learner. ${error.message}`);
  } else {
    throw error;
  }
}
