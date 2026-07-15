// Types can encode domain rules, not just describe object syntax. This file
// contrasts names for reusable shapes with literal unions that rule out invalid
// values before the program runs.
type Role = "reader" | "editor";
type Identifier = string;

// `readonly id` says identity is assigned outside this object and should not be
// rewritten through a Learner reference. `nickname?` means absent is valid.
interface Learner {
  readonly id: Identifier;
  name: string;
  role: Role;
  nickname?: string;
}

function displayName(learner: Learner): string {
  // Check against undefined instead of truthiness so an empty nickname remains
  // a deliberate, present value rather than being treated as absent.
  if (learner.nickname !== undefined) {
    return `${learner.name} (${learner.nickname})`;
  }

  return learner.name;
}

function canEdit(role: Role): boolean {
  return role === "editor";
}

// Assigning an object literal to Learner triggers excess-property checks, which
// catch misspelled fields at the boundary where the shape is created.
const ada: Learner = {
  id: "learner-1",
  name: "Ada",
  role: "editor",
  nickname: "Countess",
};

const lin: Learner = {
  id: "learner-2",
  name: "Lin",
  role: "reader",
};

for (const learner of [ada, lin]) {
  console.log(`${displayName(learner)} can edit: ${canEdit(learner.role)}`);
}
