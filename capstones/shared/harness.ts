export const CAPSTONE_IMPLEMENTATIONS = ["starter", "solution"] as const;

export type CapstoneImplementation = (typeof CAPSTONE_IMPLEMENTATIONS)[number];
export type CapstoneTrack = "comparative" | "idiomatic";

export function selectCapstoneImplementation(
  value: string | undefined,
  fallback: CapstoneImplementation = "solution",
): CapstoneImplementation {
  if (value === undefined || value === "") {
    return fallback;
  }
  if (value === "starter" || value === "solution") {
    return value;
  }
  throw new TypeError(
    `CAPSTONE_IMPLEMENTATION must be starter or solution, received ${JSON.stringify(value)}`,
  );
}

export class CapstoneIncompleteError extends Error {
  readonly code = "CAPSTONE_INCOMPLETE";

  constructor(
    readonly track: CapstoneTrack,
    readonly implementation: CapstoneImplementation,
    readonly boundary: string,
  ) {
    super(`${track}/${implementation} has not implemented ${boundary}`);
    this.name = "CapstoneIncompleteError";
  }
}
