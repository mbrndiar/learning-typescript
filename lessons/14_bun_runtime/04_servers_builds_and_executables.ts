const scratchId = crypto.randomUUID();
const entryPath = `${import.meta.dir}/.lesson-04-${scratchId}.ts`;
const executablePath = `${import.meta.dir}/.lesson-04-${scratchId}`;
const entryFile = Bun.file(entryPath);
const executableFile = Bun.file(executablePath);

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  routes: {
    "/health": Response.json({ ok: true }),
  },
  fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname === "/stream") {
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
  const build = await Bun.build({
    entrypoints: [entryPath],
    target: "bun",
    format: "esm",
    minify: true,
  });
  if (!build.success || build.outputs.length !== 1) {
    throw new AggregateError(build.logs, "Bun.build failed");
  }

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
  await server.stop(true);
  if (await entryFile.exists()) {
    await entryFile.delete();
  }
  if (await executableFile.exists()) {
    await executableFile.delete();
  }
}
