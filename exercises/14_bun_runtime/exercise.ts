export interface CapturedReport {
  readonly value: unknown;
  readonly bytesWritten: number;
}

export async function captureJsonReport(
  command: readonly string[],
  outputPath: string,
  timeoutMilliseconds = 1_000,
): Promise<CapturedReport> {
  void command;
  void outputPath;
  void timeoutMilliseconds;
  throw new Error("TODO: capture JSON with Bun.spawn and Bun.write");
}
