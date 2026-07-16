// Smoke test for Bun's two distribution paths: bundling (Bun.build) and a
// self-contained executable (bun build --compile). It builds, compiles, runs
// the compiled CLI once to confirm it actually works, and always deletes the
// generated executable, data file, and directory in finally so the tree is left
// clean. Subprocess timeouts stop a hung build or run from stalling CI.
export {};

const executable =
  process.platform === "win32" ? "compiled/task-bun.exe" : "compiled/task-bun";
const taskFile = "compiled/tasks.json";
const relayExecutable =
  process.platform === "win32" ? "compiled/relay-bun.exe" : "compiled/relay-bun";
const relayLog = "compiled/events.jsonl";

const build = await Bun.build({
  entrypoints: ["project/task-bun/main.ts"],
  target: "bun",
  format: "esm",
  minify: true,
});
if (!build.success || build.outputs.length !== 1) {
  throw new AggregateError(build.logs, "Bun.build smoke failed");
}
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
  const compile = Bun.spawn({
    cmd: [
      process.execPath,
      "build",
      "--compile",
      "project/task-bun/main.ts",
      "--outfile",
      executable,
    ],
    stdout: "pipe",
    stderr: "pipe",
    timeout: 60_000,
  });
  const [compileOutput, compileError, compileExit] = await Promise.all([
    new Response(compile.stdout).text(),
    new Response(compile.stderr).text(),
    compile.exited,
  ]);
  if (compileExit !== 0) {
    throw new Error(
      compileError.trim() ||
        compileOutput.trim() ||
        `bun build --compile exited with ${compileExit}`,
    );
  }

  const run = Bun.spawn({
    cmd: [executable, "--file", taskFile, "add", "Compiled Bun task"],
    stdout: "pipe",
    stderr: "pipe",
    timeout: 5_000,
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(run.stdout).text(),
    new Response(run.stderr).text(),
    run.exited,
  ]);
  if (exitCode !== 0 || !stdout.includes("added task 1")) {
    throw new Error(
      stderr.trim() || `compiled Bun CLI produced unexpected output: ${stdout.trim()}`,
    );
  }

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
    `Bun bundle and executable smoke passed (${build.outputs[0]!.size} task bytes, ${relayBuild.outputs[0]!.size} relay bytes)`,
  );
} finally {
  for (const path of [executable, taskFile, relayExecutable, relayLog]) {
    const file = Bun.file(path);
    if (await file.exists()) {
      await file.delete();
    }
  }
  await Bun.$`rmdir compiled`.quiet().nothrow();
}
