// Deno puts configuration, import maps, tasks, and package interop in one
// place. This lesson names each dependency source so portability tradeoffs
// stay visible instead of being hidden behind a resolver.
import { stableLines } from "@course/helpers";
import { join } from "@std/path";

export interface DependencyExample {
  readonly specifier: string;
  readonly purpose: string;
  readonly kind: "native" | "jsr" | "npm" | "node-compatibility";
}

// The same specifier shape can mean local code, JSR, npm, or Node
// compatibility; labeling kind prevents treating all sources as portable.
export const dependencyExamples: readonly DependencyExample[] = [
  {
    specifier: "./course-helpers.ts",
    purpose: "local ESM with an explicit extension",
    kind: "native",
  },
  {
    specifier: "jsr:@std/path",
    purpose: "a versioned package from the JavaScript Registry",
    kind: "jsr",
  },
  {
    specifier: "npm:zod",
    purpose: "an npm package resolved by Deno",
    kind: "npm",
  },
  {
    specifier: "node:path",
    purpose: "Node compatibility API, not a Deno-native API",
    kind: "node-compatibility",
  },
];

// These commands are orientation tasks. audit is listed separately because it
// may need registry data, unlike purely local fmt, lint, check, and docs.
export function toolchainOrientation(): readonly string[] {
  return [
    "deno fmt --check <paths>: verify formatting",
    "deno lint <paths>: find suspicious code",
    "deno check <entrypoints>: type-check the module graph",
    "deno doc <module>: render API documentation",
    "deno audit: inspect installed dependency advisories (registry data may require network)",
  ];
}

// Stable output keeps demos deterministic even as the teaching order above is
// maintained for humans.
export function describeConfiguration(): string {
  return stableLines([
    "deno.json imports make local or registry specifiers explicit",
    "deno.json tasks provide repeatable project commands",
    "Deno can consume package.json and npm: dependencies when interoperability is needed",
    "JSR packages are ESM-first and publish TypeScript-aware metadata",
    "Node compatibility examples must remain clearly labeled",
  ]);
}

if (import.meta.main) {
  console.log(describeConfiguration());
  console.log(toolchainOrientation().join("\n"));
  console.log(`JSR path example: ${join("tasks", "archive.json")}`);
}
