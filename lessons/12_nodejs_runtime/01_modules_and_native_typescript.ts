import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import type { PathLike } from "node:fs";
import { createRequire, isBuiltin } from "node:module";

interface RuntimeEntry {
  readonly specifier: string;
  readonly resolved: string;
}

function displayPath(path: PathLike): string {
  return path.toString();
}

const require = createRequire(import.meta.url);
const entries = [
  {
    specifier: "node:path",
    resolved: import.meta.resolve("node:path"),
  },
  {
    specifier: "tsx",
    resolved: import.meta.resolve("tsx"),
  },
] satisfies readonly RuntimeEntry[];

assert.equal(isBuiltin("node:path"), true);
assert.match(require.resolve("typescript"), /typescript/);
assert.equal(displayPath(import.meta.filename), import.meta.filename);

const erasableSource = `
  interface Message { readonly text: string }
  const message: Message = { text: "native TypeScript works" };
  console.log(message.text);
`;
const erasableRun = spawnSync(
  process.execPath,
  ["--input-type=module-typescript", "--eval", erasableSource],
  { encoding: "utf8" },
);
assert.equal(erasableRun.status, 0, erasableRun.stderr);
assert.match(erasableRun.stdout, /native TypeScript works/);

const generatedJavaScriptSource = `
  enum Direction { Up, Down }
  console.log(Direction.Up);
`;
const generatedJavaScriptRun = spawnSync(
  process.execPath,
  ["--input-type=module-typescript", "--eval", generatedJavaScriptSource],
  { encoding: "utf8" },
);
assert.notEqual(generatedJavaScriptRun.status, 0);

console.log({
  nativeTypeScript: process.features.typescript,
  resolutions: entries,
  erasableSyntaxExitCode: erasableRun.status,
  enumWithoutTransformExitCode: generatedJavaScriptRun.status,
});
