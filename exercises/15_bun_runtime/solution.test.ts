import { afterEach, describe, expect, test } from "bun:test";

import { captureJsonReport } from "./solution.ts";

// Each test owns any file it creates. Central cleanup keeps failures from
// leaking artifacts into later scenarios.
const artifacts = new Set<string>();

afterEach(async () => {
  await Promise.all(
    [...artifacts].map(async (path) => {
      const file = Bun.file(path);
      if (await file.exists()) {
        await file.delete();
      }
      artifacts.delete(path);
    }),
  );
});

function artifactPath(): string {
  const path = `${import.meta.dir}/.report-${crypto.randomUUID()}.json`;
  artifacts.add(path);
  return path;
}

describe("captureJsonReport", () => {
  test("captures, parses, and writes JSON", async () => {
    const outputPath = artifactPath();

    const result = await captureJsonReport(
      [process.execPath, "-e", 'console.log(JSON.stringify({runtime:"bun",count:2}))'],
      outputPath,
    );

    expect(result.value).toEqual({ runtime: "bun", count: 2 });
    expect(await Bun.file(outputPath).json()).toEqual(result.value);
    expect(result.bytesWritten).toBeGreaterThan(0);
  });

  // Failure diagnostics should come from stderr, but a failed command must not
  // leave a durable report behind.
  test("reports stderr from a failed command without writing", async () => {
    const outputPath = artifactPath();

    await expect(
      captureJsonReport(
        [process.execPath, "-e", 'console.error("expected failure");process.exit(7)'],
        outputPath,
      ),
    ).rejects.toThrow(/expected failure/);
    expect(await Bun.file(outputPath).exists()).toBe(false);
  });

  // A timeout is a lifecycle guarantee: a hung child must be stopped and must
  // not be mistaken for a successful empty report.
  test("kills a command that exceeds its timeout", async () => {
    const outputPath = artifactPath();

    await expect(
      captureJsonReport(
        [process.execPath, "-e", "setTimeout(() => {}, 10_000)"],
        outputPath,
        20,
      ),
    ).rejects.toThrow(/exited with code/);
    expect(await Bun.file(outputPath).exists()).toBe(false);
  });

  // Argument and JSON validation happen before persistence, so invalid input
  // cannot overwrite a previously valid report file.
  test("validates arguments and JSON before writing", async () => {
    const outputPath = artifactPath();

    await expect(captureJsonReport([], outputPath)).rejects.toThrow(/empty/);
    await expect(
      captureJsonReport(
        [process.execPath, "-e", 'console.log("not JSON")'],
        outputPath,
      ),
    ).rejects.toBeInstanceOf(SyntaxError);
    expect(await Bun.file(outputPath).exists()).toBe(false);
  });
});
