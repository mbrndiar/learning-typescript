import { spawn } from "node:child_process";
import { mkdir, readFile, rm } from "node:fs/promises";

interface RuntimeCommand {
  readonly name: string;
  readonly command: string;
  readonly prefix: readonly string[];
  readonly entry: string;
}

const root = "capstones/idiomatic/tests/.test-data/conformance";
const input = "capstones/idiomatic/tests/fixtures/events-valid.jsonl";
const mixedInput = "capstones/idiomatic/tests/fixtures/events-mixed.jsonl";
const runtimes: readonly RuntimeCommand[] = [
  {
    name: "Node.js",
    command: process.execPath,
    prefix: ["--import=tsx"],
    entry: "capstones/idiomatic/solution/node/main.ts",
  },
  {
    name: "Deno",
    command: "deno",
    prefix: [
      "run",
      `--allow-read=${root},capstones/idiomatic/tests/fixtures`,
      `--allow-write=${root}`,
    ],
    entry: "capstones/idiomatic/solution/deno/main.ts",
  },
  {
    name: "Bun",
    command: "bun",
    prefix: ["run"],
    entry: "capstones/idiomatic/solution/bun/main.ts",
  },
];

function run(
  runtime: RuntimeCommand,
  arguments_: readonly string[],
): Promise<{
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
}> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      runtime.command,
      [...runtime.prefix, runtime.entry, ...arguments_],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal !== null) {
        reject(new Error(`${runtime.name} relay CLI terminated by ${signal}`));
      } else {
        resolve({ code: code ?? 1, stdout, stderr });
      }
    });
  });
}

await rm(root, { recursive: true, force: true });
await mkdir(root, { recursive: true });
try {
  const observable: string[] = [];
  const mixedObservable: string[] = [];
  for (const runtime of runtimes) {
    const log = `${root}/${runtime.name.toLowerCase().replaceAll(".", "")}.jsonl`;
    const ingest = await run(runtime, ["ingest", "--log", log, "--input", input]);
    if (ingest.code !== 0 || ingest.stderr !== "") {
      throw new Error(
        `${runtime.name} ingest failed (${ingest.code}): ${ingest.stderr}`,
      );
    }
    const replay = await run(runtime, [
      "replay",
      "--log",
      log,
      "--after",
      "0",
      "--limit",
      "100",
    ]);
    if (replay.code !== 0 || replay.stderr !== "") {
      throw new Error(
        `${runtime.name} replay failed (${replay.code}): ${replay.stderr}`,
      );
    }
    observable.push(`${ingest.stdout}\u0000${replay.stdout}`);

    const mixedLog = `${root}/${runtime.name.toLowerCase().replaceAll(".", "")}-mixed.jsonl`;
    const mixed = await run(runtime, [
      "ingest",
      "--log",
      mixedLog,
      "--input",
      mixedInput,
    ]);
    if (mixed.code !== 3 || mixed.stderr !== "") {
      throw new Error(
        `${runtime.name} mixed ingest failed (${mixed.code}): ${mixed.stderr}`,
      );
    }
    mixedObservable.push(mixed.stdout);
  }
  if (!observable.every((value) => value === observable[0])) {
    throw new Error("Node, Deno, and Bun relay CLIs produced different semantics");
  }
  if (!mixedObservable.every((value) => value === mixedObservable[0])) {
    throw new Error("Node, Deno, and Bun mixed ingest streams differ");
  }
  const expectedIngest = await readFile(
    "capstones/idiomatic/tests/fixtures/expected-ingest.jsonl",
    "utf8",
  );
  const expectedReplay = await readFile(
    "capstones/idiomatic/tests/fixtures/expected-replay.jsonl",
    "utf8",
  );
  if (observable[0] !== `${expectedIngest}\u0000${expectedReplay}`) {
    throw new Error("relay CLI output does not match the semantic fixture");
  }
  console.log("Node, Deno, and Bun relay CLI conformance passed");
} finally {
  await rm(root, { recursive: true, force: true });
}
