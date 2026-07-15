// Runtime boundaries give TypeScript values an unknown shape. This lesson
// keeps JSON and caught errors as unknown until checks prove the pieces the
// program needs.
interface Profile {
  readonly name: string;
  readonly active: boolean;
}

// CONTRACT: accept only the Profile shape used by the app and return a
// normalized value; reject invalid boundary data close to where it enters.
function parseProfile(value: unknown): Profile {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("profile must be an object");
  }

  // After the object guard, each property is still unknown until narrowed.
  const record = value as Record<string, unknown>;
  if (typeof record.name !== "string" || record.name.trim() === "") {
    throw new TypeError("profile.name must be a non-empty string");
  }
  if (typeof record.active !== "boolean") {
    throw new TypeError("profile.active must be a boolean");
  }

  return { name: record.name.trim(), active: record.active };
}

// JavaScript can throw any value, so a catch boundary must not assume Error.
function describeError(value: unknown): string {
  return value instanceof Error ? value.message : String(value);
}

for (const text of ['{"name":"Ada","active":true}', '{"name":"","active":true}']) {
  try {
    // JSON.parse produces runtime data; validation must happen before trust.
    const profile = parseProfile(JSON.parse(text) as unknown);
    console.log(`${profile.name}: ${profile.active ? "active" : "inactive"}`);
  } catch (error: unknown) {
    console.log(`Invalid profile: ${describeError(error)}`);
  }
}
