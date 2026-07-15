import { describe, expect, test } from "bun:test";

import { MemoryTaskStorage } from "../test-support/memory-storage.ts";
import { parseCli, runCli } from "./cli.ts";

describe("Bun task CLI", () => {
  test("reuses the shared parser", () => {
    const parsed = parseCli([
      "--backend",
      "rest",
      "--url",
      "http://127.0.0.1:9000",
      "--timeout",
      "250",
      "add",
      "Bun task",
    ]);

    expect(parsed.options.backend).toBe("rest");
    expect(parsed.options.url.href).toBe("http://127.0.0.1:9000/");
    expect(parsed.options.timeoutMilliseconds).toBe(250);
    expect(parsed.command).toEqual({ kind: "add", title: "Bun task" });
  });

  test("executes shared CLI behavior through injected storage", async () => {
    const storage = new MemoryTaskStorage();
    const stdout: string[] = [];
    const stderr: string[] = [];
    const io = {
      stdout: (text: string) => stdout.push(text),
      stderr: (text: string) => stderr.push(text),
    };

    expect(await runCli(["add", "Test CLI"], io, () => storage)).toBe(0);
    expect(await runCli(["list"], io, () => storage)).toBe(0);
    expect(stdout.join("\n")).toContain("1\tpending\tTest CLI");
    expect(stderr).toEqual([]);

    expect(await runCli(["complete", "0"], io, () => storage)).toBe(1);
    expect(stderr.at(-1)).toMatch(/positive integer/);
  });
});
