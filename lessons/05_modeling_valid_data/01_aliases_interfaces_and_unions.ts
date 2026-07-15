type Role = "reader" | "editor";
type Identifier = string;

interface Learner {
  readonly id: Identifier;
  name: string;
  role: Role;
  nickname?: string;
}

function displayName(learner: Learner): string {
  if (learner.nickname !== undefined) {
    return `${learner.name} (${learner.nickname})`;
  }

  return learner.name;
}

function canEdit(role: Role): boolean {
  return role === "editor";
}

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
