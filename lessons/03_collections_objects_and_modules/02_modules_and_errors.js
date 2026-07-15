// This lesson shows ES modules and error handling. Importing another module
// runs it once (so its console output appears first), and a function throws
// when it cannot fulfill its contract, leaving the caller to decide whether
// to recover.

// Local import specifiers include the ".js" extension because that names the
// actual file Node.js loads.
import { describeLearner } from "./01_collections_and_objects.js";

const learners = [
  { id: "learner-1", name: "Ada" },
  { id: "learner-2", name: "Lin" },
];

// Contract: return the matching learner, or throw if none exists. Returning a
// "not found" sentinel would let callers forget to check it; throwing forces
// the missing case to be handled.
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
  // Only handle what we understand. Any thrown value could reach here, so we
  // confirm it is an Error before reading .message and re-throw anything else
  // rather than swallowing an unexpected failure.
  if (error instanceof Error) {
    console.log(`Could not find learner. ${error.message}`);
  } else {
    throw error;
  }
}
