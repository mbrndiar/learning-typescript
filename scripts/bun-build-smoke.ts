export {};

const executable =
  process.platform === "win32" ? "compiled/task-bun.exe" : "compiled/task-bun";
const taskFile = "compiled/tasks.json";

const build = await Bun.build({
  entrypoints: ["project/task-bun/main.ts"],
  target: "bun",
  format: "esm",
  minify: true,
});
if (!build.success || build.outputs.length !== 1) {
  throw new AggregateError(build.logs, "Bun.build smoke failed");
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

  console.log(
    `Bun bundle and executable smoke passed (${build.outputs[0]!.size} bundled bytes)`,
  );
} finally {
  for (const path of [executable, taskFile]) {
    const file = Bun.file(path);
    if (await file.exists()) {
      await file.delete();
    }
  }
  await Bun.$`rmdir compiled`.quiet().nothrow();
}
