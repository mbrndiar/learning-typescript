export interface RuntimeProfile {
  readonly name: string;
  readonly defaultDenyPermissions: boolean;
  readonly nodeCompatibility: "reference" | "high" | "partial";
  readonly nativeBundler: boolean;
  readonly nativeSqlite: boolean;
}

export interface RuntimeRequirements {
  readonly defaultDenyPermissions?: boolean;
  readonly referenceNodeCompatibility?: boolean;
  readonly nativeBundler?: boolean;
  readonly nativeSqlite?: boolean;
}

export function findCompatibleRuntimes(
  profiles: readonly RuntimeProfile[],
  requirements: RuntimeRequirements,
): readonly string[] {
  return profiles
    .filter(
      (profile) =>
        (!requirements.defaultDenyPermissions || profile.defaultDenyPermissions) &&
        (!requirements.referenceNodeCompatibility ||
          profile.nodeCompatibility === "reference") &&
        (!requirements.nativeBundler || profile.nativeBundler) &&
        (!requirements.nativeSqlite || profile.nativeSqlite),
    )
    .map((profile) => profile.name);
}
