function hasProperty(
  value: unknown,
  property: PropertyKey,
): value is Record<PropertyKey, unknown> {
  return typeof value === "object" && value !== null && property in value;
}

function runtimeName(scope: typeof globalThis): string {
  if (Reflect.has(scope, "Deno")) {
    return "Deno";
  }
  if (Reflect.has(scope, "Bun")) {
    return "Bun";
  }
  const processValue = Reflect.get(scope, "process") as unknown;
  if (
    hasProperty(processValue, "versions") &&
    hasProperty(processValue.versions, "node")
  ) {
    return "Node.js";
  }
  return "unknown JavaScript runtime";
}

console.log(`Running on ${runtimeName(globalThis)}`);
