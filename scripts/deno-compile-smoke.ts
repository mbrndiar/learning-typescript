// Smoke test for `deno compile`: builds a self-contained relay executable with
// least-privilege permissions and removes generated output in finally.
const relayOutput = Deno.build.os === "windows" ? "compiled/relay-deno.exe" : "compiled/relay-deno";

await Deno.mkdir("compiled", { recursive: true });

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
  for (const path of [relayOutput]) {
    await Deno.remove(path).catch((error: unknown) => {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    });
  }
  await Deno.remove("compiled").catch((error: unknown) => {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  });
}
