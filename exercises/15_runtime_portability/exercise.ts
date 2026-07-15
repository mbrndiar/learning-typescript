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
  _profiles: readonly RuntimeProfile[],
  _requirements: RuntimeRequirements,
): readonly string[] {
  throw new Error("TODO: return the names of every compatible runtime");
}
