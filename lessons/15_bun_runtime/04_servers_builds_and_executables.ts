// This lesson keeps the full Bun lifecycle in view: a server starts
// immediately, an in-memory bundle is not an executable, and compiled output
// is a platform-specific artifact that must be cleaned up.
const scratchId = crypto.randomUUID();
const entryPath = `${import.meta.dir}/.lesson-04-${scratchId}.ts`;
const executablePath = `${import.meta.dir}/.lesson-04-${scratchId}`;
const entryFile = Bun.file(entryPath);
const executableFile = Bun.file(executablePath);

// Bun.serve creates a live server as soon as it is called. Keeping the handle
// lets callers stop it explicitly instead of leaving a process-level resource
// running after the lesson or test completes.
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  routes: {
    "/health": Response.json({ ok: true }),
  },
  fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname === "/stream") {
      // The response body is built from Web streams, not Node streams. That is
      // the portable data-flow layer inside a Bun-native server.
      const body = new ReadableStream<string>({
        start(controller) {
          controller.enqueue("Bun");
          controller.enqueue(" stream");
          controller.close();
        },
      });
      return new Response(body.pipeThrough(new TextEncoderStream()));
    }
    return Response.json({ error: "not found" }, { status: 404 });
  },
});

try {
  const health = await fetch(new URL("/health", server.url)).then((response) =>
    response.json(),
  );
  const streamed = await fetch(new URL("/stream", server.url)).then((response) =>
    response.text(),
  );

  await Bun.write(entryFile, 'console.log("compiled Bun program");\n');
  // Without an output directory, Bun.build returns artifacts in memory. This
  // proves bundling without leaving a generated bundle in the repository.
  const build = await Bun.build({
    entrypoints: [entryPath],
    target: "bun",
    format: "esm",
    minify: true,
  });
  if (!build.success || build.outputs.length !== 1) {
    throw new AggregateError(build.logs, "Bun.build failed");
  }

  // Compiling is different from bundling: it writes an executable artifact for
  // the current platform, so stdout, stderr, and exit must all be observed.
  const compile = Bun.spawn({
    cmd: [
      process.execPath,
      "build",
      entryPath,
      "--compile",
      "--outfile",
      executablePath,
    ],
    stdout: "pipe",
    stderr: "pipe",
    timeout: 30_000,
  });
  const [compileOutput, compileError, compileExit] = await Promise.all([
    new Response(compile.stdout).text(),
    new Response(compile.stderr).text(),
    compile.exited,
  ]);
  if (compileExit !== 0) {
    throw new Error(`bun build --compile failed: ${compileError.trim()}`);
  }

  // Running the compiled file verifies the artifact is executable, not merely
  // present on disk.
  const executable = Bun.spawn({
    cmd: [executablePath],
    stdout: "pipe",
    stderr: "pipe",
    timeout: 5_000,
  });
  const [executableOutput, executableExit] = await Promise.all([
    new Response(executable.stdout).text(),
    executable.exited,
  ]);
  if (executableExit !== 0) {
    throw new Error(`compiled executable exited with ${executableExit}`);
  }

  console.log({
    health,
    streamed,
    bundledBytes: build.outputs[0]!.size,
    compileCommand: "bun build entry.ts --compile --outfile app",
    compileOutput: compileOutput.trim(),
    executableOutput: executableOutput.trim(),
  });
} finally {
  // stop(true) closes the server promptly for this deterministic lesson; real
  // services usually coordinate graceful shutdown around in-flight requests.
  await server.stop(true);
  if (await entryFile.exists()) {
    await entryFile.delete();
  }
  if (await executableFile.exists()) {
    await executableFile.delete();
  }
}
