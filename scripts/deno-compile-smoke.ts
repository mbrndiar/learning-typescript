// Smoke test for `deno compile`: builds a self-contained relay executable with
// least-privilege permissions and removes generated output in finally.
const scratchRoot = ".test-data";
let ownsScratchRoot = false;
try {
  await Deno.mkdir(scratchRoot);
  ownsScratchRoot = true;
} catch (error: unknown) {
  if (!(error instanceof Deno.errors.AlreadyExists)) {
    throw error;
  }
}
const outputDirectory = await Deno.makeTempDir({
  dir: scratchRoot,
  prefix: "deno-compile-",
});
const relayOutput = `${outputDirectory}/${
  Deno.build.os === "windows" ? "relay-deno.exe" : "relay-deno"
}`;

try {
  const relayStatus = await new Deno.Command(Deno.execPath(), {
    args: [
      "compile",
      "--quiet",
      "--output",
      relayOutput,
      "--allow-read=.relay-data",
      "--allow-write=.relay-data",
      "capstones/idiomatic/solution/deno/main.ts",
    ],
    stdin: "null",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn().status;
  if (!relayStatus.success) {
    throw new Error(`deno relay compile exited with code ${relayStatus.code}`);
  }
  console.log("Deno relay executable compile smoke passed");
} finally {
  await Deno.remove(outputDirectory, { recursive: true });
  if (ownsScratchRoot) {
    await Deno.remove(scratchRoot);
  }
}
