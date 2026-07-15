interface Profile {
  readonly name: string;
  readonly active: boolean;
}

function parseProfile(value: unknown): Profile {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("profile must be an object");
  }

  const record = value as Record<string, unknown>;
  if (typeof record.name !== "string" || record.name.trim() === "") {
    throw new TypeError("profile.name must be a non-empty string");
  }
  if (typeof record.active !== "boolean") {
    throw new TypeError("profile.active must be a boolean");
  }

  return { name: record.name.trim(), active: record.active };
}

function describeError(value: unknown): string {
  return value instanceof Error ? value.message : String(value);
}

for (const text of ['{"name":"Ada","active":true}', '{"name":"","active":true}']) {
  try {
    const profile = parseProfile(JSON.parse(text) as unknown);
    console.log(`${profile.name}: ${profile.active ? "active" : "inactive"}`);
  } catch (error: unknown) {
    console.log(`Invalid profile: ${describeError(error)}`);
  }
}
