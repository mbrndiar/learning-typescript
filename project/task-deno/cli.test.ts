import { parseCli, runCli } from "./cli.ts";
import { assert, assertEquals, MemoryTaskStorage } from "./test-support.ts";

Deno.test("parseCli handles portable REST options", () => {
  const parsed = parseCli([
    "--backend",
    "rest",
    "--url",
    "http://127.0.0.1:9000",
    "--timeout",
    "1000",
    "add",
    "Task",
  ]);
  assertEquals(parsed.options.backend, "rest");
  assertEquals(parsed.options.url.href, "http://127.0.0.1:9000/");
  assertEquals(parsed.options.timeoutMilliseconds, 1000);
  assertEquals(parsed.command, { kind: "add", title: "Task" });
});

Deno.test({
  name: "runCli executes through an injected storage without runtime permissions",
  permissions: { read: false, write: false, net: false, env: false, run: false },
  fn: async () => {
    const storage = new MemoryTaskStorage();
    const stdout: string[] = [];
    const stderr: string[] = [];
    const io = {
      stdout: (text: string) => stdout.push(text),
      stderr: (text: string) => stderr.push(text),
    };

    assertEquals(await runCli(["add", "Deno CLI"], io, () => storage), 0);
    assertEquals(await runCli(["list"], io, () => storage), 0);
    assert(stdout.join("\n").includes("1\tpending\tDeno CLI"));
    assertEquals(stderr, []);

    assertEquals(await runCli(["complete", "0"], io, () => storage), 1);
    assert((stderr.at(-1) ?? "").includes("positive integer"));
  },
});
