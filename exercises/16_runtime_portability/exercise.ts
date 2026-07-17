// A profile describes capabilities the selector can reason about without
// importing or executing any runtime-specific APIs.
export interface RuntimeProfile {
  readonly name: string;
  readonly defaultDenyPermissions: boolean;
  readonly nodeCompatibility: "reference" | "high" | "partial";
  readonly nativeBundler: boolean;
  readonly nativeSqlite: boolean;
}

// Optional requirements are filters only when present. Omitting a capability
// means the caller has no preference for that axis.
export interface RuntimeRequirements {
  readonly defaultDenyPermissions?: boolean;
  readonly referenceNodeCompatibility?: boolean;
  readonly nativeBundler?: boolean;
  readonly nativeSqlite?: boolean;
}

// CONTRACT: return the profile names that satisfy every requested capability,
// preserving the input order so callers can rank profiles before filtering.
export function findCompatibleRuntimes(
  _profiles: readonly RuntimeProfile[],
  _requirements: RuntimeRequirements,
): readonly string[] {
  throw new Error("TODO: return the names of every compatible runtime");
}
