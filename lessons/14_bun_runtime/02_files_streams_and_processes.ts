const scratchPath = `${import.meta.dir}/.lesson-02-${crypto.randomUUID()}.txt`;
const scratchFile = Bun.file(scratchPath);

try {
  const source = new Blob(["first line\n", "second line\n"], {
    type: "text/plain",
  });
  const bytesWritten = await Bun.write(scratchFile, source);

  const stream: ReadableStream<Uint8Array> = scratchFile.stream();
  const streamedText = await new Response(stream).text();

  const quickProcess = Bun.spawn({
    cmd: [process.execPath, "-e", 'console.log("child output")'],
    stdout: "pipe",
    stderr: "pipe",
    timeout: 1_000,
  });
  const childOutput = (await new Response(quickProcess.stdout).text()).trim();
  const quickExitCode = await quickProcess.exited;

  const timedProcess = Bun.spawn({
    cmd: [process.execPath, "-e", "setTimeout(() => {}, 10_000)"],
    stdout: "ignore",
    stderr: "ignore",
    timeout: 20,
    killSignal: "SIGKILL",
  });
  const timedExitCode = await timedProcess.exited;

  const controller = new AbortController();
  const signalledProcess = Bun.spawn({
    cmd: [process.execPath, "-e", "setTimeout(() => {}, 10_000)"],
    stdout: "ignore",
    stderr: "ignore",
    signal: controller.signal,
    killSignal: "SIGKILL",
  });
  controller.abort("lesson cleanup");
  const signalledExitCode = await signalledProcess.exited;

  if (
    streamedText !== "first line\nsecond line\n" ||
    childOutput !== "child output" ||
    quickExitCode !== 0 ||
    timedExitCode === 0 ||
    signalledExitCode === 0
  ) {
    throw new Error(
      "the Bun file or process demonstration produced an unexpected result",
    );
  }

  console.log({
    bytesWritten,
    mediaType: scratchFile.type,
    streamedText: streamedText.trim().split("\n"),
    childOutput,
    timeoutStoppedChild: timedExitCode !== 0,
    signalStoppedChild: signalledExitCode !== 0,
  });
} finally {
  if (await scratchFile.exists()) {
    await scratchFile.delete();
  }
}
