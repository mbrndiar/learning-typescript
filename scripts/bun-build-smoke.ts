// Smoke test for Bun's two distribution paths: bundling (Bun.build) and a
// self-contained executable (bun build --compile). It builds, compiles, and runs
// the relay CLI once, then deletes generated artifacts in finally.
export {};

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const outputDirectory = await mkdtemp(join(tmpdir(), "learning-typescript-bun-"));
const relayExecutable = join(
  outputDirectory,
  process.platform === "win32" ? "relay-bun.exe" : "relay-bun",
);
const relayLog = join(outputDirectory, "events.jsonl");

const relayBuild = await Bun.build({
  entrypoints: ["capstones/idiomatic/solution/bun/main.ts"],
  target: "bun",
  format: "esm",
  minify: true,
});
if (!relayBuild.success || relayBuild.outputs.length !== 1) {
  throw new AggregateError(relayBuild.logs, "Bun relay build smoke failed");
}

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
  await rm(outputDirectory, { recursive: true, force: true });
}
