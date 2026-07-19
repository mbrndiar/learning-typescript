import type { CapstoneImplementation } from "../../../shared/harness.ts";
import type { IdiomaticCoreModule } from "./api.ts";
import { assert, deepEqual, equal } from "./testing.ts";

export interface ConformanceFiles {
  readText(path: string): Promise<string>;
}

export async function runM5ConformanceContract(
  runtime: "node" | "deno" | "bun",
  implementation: CapstoneImplementation,
  core: IdiomaticCoreModule,
  files: ConformanceFiles,
): Promise<void> {
  equal(
    core.CAPSTONE_IMPLEMENTATION,
    implementation,
    `${runtime} must load the selected implementation`,
  );
  const input = await files.readText(
    "capstones/idiomatic/tests/fixtures/events-valid.jsonl",
  );
  const expected: unknown = JSON.parse(
    await files.readText("capstones/idiomatic/tests/fixtures/expected-normalized.json"),
  );
  assert(Array.isArray(expected), "expected fixture must be an array");
  const actual = input
    .trim()
    .split("\n")
    .map((line) => {
      const value: unknown = JSON.parse(line);
      return core.parseEvent(value);
    })
    .map((result) => {
      assert(result.ok, "valid fixture event must parse");
      return result.event;
    });
  deepEqual(actual, expected, `${runtime} must observe the shared fixture semantics`);
}
