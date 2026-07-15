// The parsed JSON stays unknown because parsing proves only valid JSON, not a
// domain-specific shape. Validation would be a separate boundary.
export interface CapturedReport {
  readonly value: unknown;
  readonly bytesWritten: number;
}

// CONTRACT: run a command with Bun process APIs, parse stdout as JSON, and
// write the exact JSON text only after the command and parsing both succeed.
export async function captureJsonReport(
  command: readonly string[],
  outputPath: string,
  timeoutMilliseconds = 1_000,
): Promise<CapturedReport> {
  // Validate the boundary before spawning so bad inputs do not create child
  // processes or partial report files.
  if (command.length === 0) {
    throw new TypeError("command must not be empty");
  }
  if (!Number.isSafeInteger(timeoutMilliseconds) || timeoutMilliseconds <= 0) {
    throw new RangeError("timeout must be a positive integer");
  }

  // stdout and stderr are piped and bounded. Awaiting both streams together
  // with the exit status prevents deadlocks and keeps diagnostics finite.
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

  // A non-zero exit means there is no trustworthy report. stderr is useful as
  // context, but it must not be allowed to grow without maxBuffer above.
  if (exitCode !== 0) {
    const detail = stderr.trim();
    throw new Error(
      detail === ""
        ? `report command exited with code ${exitCode}`
        : `report command exited with code ${exitCode}: ${detail}`,
    );
  }

  // Parse before writing so invalid JSON cannot replace the last good report.
  const value = JSON.parse(stdout) as unknown;
  const bytesWritten = await Bun.write(
    outputPath,
    new Blob([stdout], { type: "application/json" }),
  );
  return { value, bytesWritten };
}
