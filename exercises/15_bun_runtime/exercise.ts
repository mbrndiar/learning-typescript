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
  // TODO: enforce the process timeout, consume both output streams, reject
  // failed commands, and keep the output file untouched on failure.
  void command;
  void outputPath;
  void timeoutMilliseconds;
  throw new Error("TODO: capture JSON with Bun.spawn and Bun.write");
}
