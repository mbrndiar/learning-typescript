import { selectExerciseTarget } from "../test-target.ts";

const implementation = selectExerciseTarget(Deno.env.get("EXERCISE_IMPLEMENTATION")) === "exercise"
  ? await import("./exercise.ts")
  : await import("./solution.ts");
const { permissionFlags } = implementation;

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

// File and network cases stay separate so a future change cannot "solve" the
// exercise with a broad -A-style flag.
Deno.test("file CLI receives only its data directory", () => {
  assertEquals(
    permissionFlags({ kind: "file-cli", dataDirectory: ".task-data" }),
    ["--allow-read=.task-data", "--allow-write=.task-data"],
  );
});

Deno.test("HTTP server receives only its listener", () => {
  assertEquals(
    permissionFlags({ kind: "http-server", hostname: "127.0.0.1", port: 8080 }),
    ["--allow-net=127.0.0.1:8080"],
  );
});

// Port validation is part of the security boundary: bad inputs should fail
// before a permission flag is constructed.
Deno.test("invalid ports are rejected", () => {
  let thrown: unknown;
  try {
    permissionFlags({ kind: "http-server", hostname: "127.0.0.1", port: 70_000 });
  } catch (error: unknown) {
    thrown = error;
  }
  if (!(thrown instanceof RangeError)) {
    throw new Error("expected a RangeError");
  }
});

Deno.test("permission targets reject authority injection and malformed hosts", () => {
  for (
    const program of [
      { kind: "file-cli", dataDirectory: "data,secrets" },
      { kind: "file-cli", dataDirectory: "data\nother" },
      { kind: "http-server", hostname: "127.0.0.1,example.com", port: 8080 },
      { kind: "http-server", hostname: "example.com/path", port: 8080 },
    ] as const
  ) {
    let thrown: unknown;
    try {
      permissionFlags(program);
    } catch (error: unknown) {
      thrown = error;
    }
    if (!(thrown instanceof TypeError)) {
      throw new Error("expected unsafe permission target to throw TypeError");
    }
  }
  assertEquals(permissionFlags({ kind: "http-server", hostname: "[::1]", port: 8080 }), [
    "--allow-net=[::1]:8080",
  ]);
});
