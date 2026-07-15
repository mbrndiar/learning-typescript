export interface CapturedReport {
  readonly value: unknown;
  readonly bytesWritten: number;
}

export async function captureJsonReport(
  command: readonly string[],
  outputPath: string,
  timeoutMilliseconds = 1_000,
): Promise<CapturedReport> {
  if (command.length === 0) {
    throw new TypeError("command must not be empty");
  }
  if (!Number.isSafeInteger(timeoutMilliseconds) || timeoutMilliseconds <= 0) {
    throw new RangeError("timeout must be a positive integer");
  }

  const subprocess = Bun.spawn({
    cmd: [...command],
    stdout: "pipe",
    stderr: "pipe",
    timeout: timeoutMilliseconds,
    killSignal: "SIGKILL",
    maxBuffer: 64 * 1024,
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(subprocess.stdout).text(),
    new Response(subprocess.stderr).text(),
    subprocess.exited,
  ]);

  if (exitCode !== 0) {
    const detail = stderr.trim();
    throw new Error(
      detail === ""
        ? `report command exited with code ${exitCode}`
        : `report command exited with code ${exitCode}: ${detail}`,
    );
  }

  const value = JSON.parse(stdout) as unknown;
  const bytesWritten = await Bun.write(
    outputPath,
    new Blob([stdout], { type: "application/json" }),
  );
  return { value, bytesWritten };
}
