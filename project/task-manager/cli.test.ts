import assert from "node:assert/strict";
import test from "node:test";

import { MemoryTaskStorage } from "../test-support/memory-storage.ts";
import { parseCli, runCli } from "./cli.ts";

test("parseCli handles storage options and commands", () => {
  const parsed = parseCli([
    "--backend",
    "rest",
    "--url",
    "http://localhost:9000",
    "--timeout",
    "1000",
    "add",
    "Task",
  ]);

  assert.equal(parsed.options.backend, "rest");
  assert.equal(parsed.options.url.href, "http://localhost:9000/");
  assert.equal(parsed.options.timeoutMilliseconds, 1000);
  assert.deepEqual(parsed.command, { kind: "add", title: "Task" });
  assert.throws(() => parseCli(["--backend", "invalid", "list"]), /file or rest/);
});

test("runCli executes commands through an injected storage", async () => {
  const storage = new MemoryTaskStorage();
  const stdout: string[] = [];
  const stderr: string[] = [];
  const io = {
    stdout: (text: string) => stdout.push(text),
    stderr: (text: string) => stderr.push(text),
  };
  const factory = () => storage;

  assert.equal(await runCli(["add", "Test CLI"], io, factory), 0);
  assert.equal(await runCli(["list"], io, factory), 0);
  assert.match(stdout.join("\n"), /1\tpending\tTest CLI/);
  assert.deepEqual(stderr, []);

  assert.equal(await runCli(["complete", "0"], io, factory), 1);
  assert.match(stderr.at(-1) ?? "", /positive integer/);
});
