export type RuntimeName = "Node.js" | "Deno" | "Bun" | "unknown";

export interface RuntimeCapabilities {
  readonly runtime: RuntimeName;
  readonly defaultPermissions: "process authority" | "explicit grants";
  readonly nativeTestRunner: string;
  readonly nativeHttpServer: string;
  readonly nativeSqlite: string;
  readonly executableBuilder: string;
}

export function detectRuntime(scope: typeof globalThis): RuntimeName {
  if (Reflect.has(scope, "Deno")) {
    return "Deno";
  }
  if (Reflect.has(scope, "Bun")) {
    return "Bun";
  }
  const processValue = Reflect.get(scope, "process");
  if (
    typeof processValue === "object" &&
    processValue !== null &&
    Reflect.has(processValue, "versions")
  ) {
    const versions = Reflect.get(processValue, "versions");
    if (
      typeof versions === "object" &&
      versions !== null &&
      Reflect.has(versions, "node")
    ) {
      return "Node.js";
    }
  }
  return "unknown";
}

export const capabilityMatrix: readonly RuntimeCapabilities[] = [
  {
    runtime: "Node.js",
    defaultPermissions: "process authority",
    nativeTestRunner: "node:test",
    nativeHttpServer: "node:http",
    nativeSqlite: "node:sqlite",
    executableBuilder: "single executable applications",
  },
  {
    runtime: "Deno",
    defaultPermissions: "explicit grants",
    nativeTestRunner: "Deno.test",
    nativeHttpServer: "Deno.serve",
    nativeSqlite: "JSR or npm package",
    executableBuilder: "deno compile",
  },
  {
    runtime: "Bun",
    defaultPermissions: "process authority",
    nativeTestRunner: "bun:test",
    nativeHttpServer: "Bun.serve",
    nativeSqlite: "bun:sqlite",
    executableBuilder: "bun build --compile",
  },
];

const runtime = detectRuntime(globalThis);
const capabilities = capabilityMatrix.find((entry) => entry.runtime === runtime);

console.log({
  runtime,
  permissions: capabilities?.defaultPermissions ?? "unknown",
  tests: capabilities?.nativeTestRunner ?? "unknown",
});
