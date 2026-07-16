import { CAPSTONE_IMPLEMENTATION, parseEvent } from "../../solution/core/index.ts";
import { assert, deepEqual, equal } from "./testing.ts";

export interface ConformanceFiles {
  readText(path: string): Promise<string>;
}

export async function runM5ConformanceContract(
  runtime: "node" | "deno" | "bun",
  files: ConformanceFiles,
): Promise<void> {
  equal(
    CAPSTONE_IMPLEMENTATION,
    "solution",
    `${runtime} must load the completed solution`,
  );
  const input = await files.readText(
    "capstones/idiomatic/tests/fixtures/events-valid.jsonl",
  );
  const expected = JSON.parse(
    await files.readText("capstones/idiomatic/tests/fixtures/expected-normalized.json"),
  ) as unknown;
  assert(Array.isArray(expected), "expected fixture must be an array");
  const actual = input
    .trim()
    .split("\n")
    .map((line) => parseEvent(JSON.parse(line) as unknown))
    .map((result) => {
      assert(result.ok, "valid fixture event must parse");
      return result.event;
    });
  deepEqual(actual, expected, `${runtime} must observe the shared fixture semantics`);
}
