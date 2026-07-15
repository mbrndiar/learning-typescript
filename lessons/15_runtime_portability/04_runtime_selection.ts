export interface RuntimeRequirements {
  readonly defaultDenyPermissions: boolean;
  readonly maximumNodeCompatibility: boolean;
  readonly nativeBundler: boolean;
  readonly nativeSqlite: boolean;
}

interface RuntimeProfile extends RuntimeRequirements {
  readonly name: "Node.js" | "Deno" | "Bun";
  readonly operationalNote: string;
}

const profiles: readonly RuntimeProfile[] = [
  {
    name: "Node.js",
    defaultDenyPermissions: false,
    maximumNodeCompatibility: true,
    nativeBundler: false,
    nativeSqlite: true,
    operationalNote: "Choose for the broadest Node ecosystem and LTS cadence.",
  },
  {
    name: "Deno",
    defaultDenyPermissions: true,
    maximumNodeCompatibility: false,
    nativeBundler: true,
    nativeSqlite: false,
    operationalNote: "Choose for default-deny permissions and an integrated toolchain.",
  },
  {
    name: "Bun",
    defaultDenyPermissions: false,
    maximumNodeCompatibility: false,
    nativeBundler: true,
    nativeSqlite: true,
    operationalNote:
      "Choose for an integrated package, test, build, and runtime workflow.",
  },
];

export function compatibleRuntimes(
  requirements: RuntimeRequirements,
): readonly RuntimeProfile[] {
  return profiles.filter(
    (profile) =>
      (!requirements.defaultDenyPermissions || profile.defaultDenyPermissions) &&
      (!requirements.maximumNodeCompatibility || profile.maximumNodeCompatibility) &&
      (!requirements.nativeBundler || profile.nativeBundler) &&
      (!requirements.nativeSqlite || profile.nativeSqlite),
  );
}

for (const profile of compatibleRuntimes({
  defaultDenyPermissions: false,
  maximumNodeCompatibility: false,
  nativeBundler: true,
  nativeSqlite: true,
})) {
  console.log(`${profile.name}: ${profile.operationalNote}`);
}
