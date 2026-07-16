// Smoke test for Bun's two distribution paths: bundling (Bun.build) and a
// self-contained executable (bun build --compile). It builds, compiles, and runs
// the relay CLI once, then deletes generated artifacts in finally.
export {};

const relayExecutable =
  process.platform === "win32" ? "compiled/relay-bun.exe" : "compiled/relay-bun";
const relayLog = "compiled/events.jsonl";

const relayBuild = await Bun.build({
  entrypoints: ["capstones/idiomatic/solution/bun/main.ts"],
  target: "bun",
  format: "esm",
  minify: true,
});
if (!relayBuild.success || relayBuild.outputs.length !== 1) {
  throw new AggregateError(relayBuild.logs, "Bun relay build smoke failed");
}

await Bun.$`mkdir -p compiled`.quiet();

try {
  const relayCompile = Bun.spawn({
    cmd: [
      process.execPath,
      "build",
      "--compile",
      "capstones/idiomatic/solution/bun/main.ts",
      "--outfile",
      relayExecutable,
    ],
    stdout: "pipe",
    stderr: "pipe",
    timeout: 60_000,
  });
  const [relayCompileOutput, relayCompileError, relayCompileExit] = await Promise.all([
    new Response(relayCompile.stdout).text(),
    new Response(relayCompile.stderr).text(),
    relayCompile.exited,
  ]);
  if (relayCompileExit !== 0) {
    throw new Error(
      relayCompileError.trim() ||
        relayCompileOutput.trim() ||
        `bun relay build --compile exited with ${relayCompileExit}`,
    );
  }
  const relayRun = Bun.spawn({
    cmd: [
      relayExecutable,
      "ingest",
      "--log",
      relayLog,
      "--input",
      "capstones/idiomatic/tests/fixtures/events-valid.jsonl",
    ],
    stdout: "pipe",
    stderr: "pipe",
    timeout: 5_000,
  });
  const [relayStdout, relayStderr, relayExit] = await Promise.all([
    new Response(relayRun.stdout).text(),
    new Response(relayRun.stderr).text(),
    relayRun.exited,
  ]);
  if (relayExit !== 0 || relayStdout.trim().split("\n").length !== 2) {
    throw new Error(
      relayStderr.trim() ||
        `compiled Bun relay produced unexpected output: ${relayStdout.trim()}`,
    );
  }

  console.log(
    `Bun relay bundle and executable smoke passed (${relayBuild.outputs[0]!.size} bytes)`,
  );
} finally {
  for (const path of [relayExecutable, relayLog]) {
    const file = Bun.file(path);
    if (await file.exists()) {
      await file.delete();
    }
  }
  await Bun.$`rmdir compiled`.quiet().nothrow();
}
