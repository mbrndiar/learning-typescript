import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import process from "node:process";
import { FetchTaskClient } from "../solution/client/fetch.ts";
import { assert, assertEquals } from "./contracts.ts";

const ROOT = "projects/tasks/.test-data/interoperability";
const DEADLINE_MS = 10_000;
type Runtime = "node" | "deno" | "bun";
type Backend = "sqlite" | "markdown";

function denoPlugDirectory(): string {
  if (process.env.DENO_DIR !== undefined) return `${process.env.DENO_DIR}/plug`;
  const cacheDirectory = process.env.XDG_CACHE_HOME ?? process.env.HOME;
  if (cacheDirectory === undefined) {
    throw new Error("DENO_DIR, XDG_CACHE_HOME, or HOME must be set for Deno SQLite");
  }
  return process.env.XDG_CACHE_HOME === undefined
    ? `${cacheDirectory}/.cache/deno/plug`
    : `${cacheDirectory}/deno/plug`;
}

function serverCommand(runtime: Runtime): readonly [string, ...string[]] {
  if (runtime === "node") {
    return [
      process.execPath,
      "--experimental-strip-types",
      "projects/tasks/solution/runtimes/node/api-main.ts",
    ];
  }
  if (runtime === "deno") {
    return [
      "deno",
      "run",
      "--lock=deno.lock",
      "--allow-net=127.0.0.1,github.com,release-assets.githubusercontent.com",
      `--allow-read=${denoPlugDirectory()}`,
      "--allow-read=projects/tasks/.test-data/interoperability",
      `--allow-write=${denoPlugDirectory()}`,
      "--allow-write=projects/tasks/.test-data/interoperability",
      "--allow-env=DENO_DIR,XDG_CACHE_HOME,HOME,DENO_SQLITE_PATH,DENO_SQLITE_LOCAL",
      "--allow-ffi",
      "projects/tasks/solution/runtimes/deno/api-main.ts",
    ];
  }
  return ["bun", "projects/tasks/solution/runtimes/bun/api-main.ts"];
}

function clientCommand(
  runtime: Runtime,
  baseUrl: string,
  title: string,
): readonly [string, ...string[]] {
  const args = ["--base-url", baseUrl, "--timeout", "2", "add", title];
  if (runtime === "node") {
    return [
      process.execPath,
      "--experimental-strip-types",
      "projects/tasks/solution/runtimes/node/cli-main.ts",
      ...args,
    ];
  }
  if (runtime === "deno") {
    return [
      "deno",
      "run",
      "--allow-net=127.0.0.1",
      "--lock=deno.lock",
      "projects/tasks/solution/runtimes/deno/cli-main.ts",
      ...args,
    ];
  }
  return ["bun", "projects/tasks/solution/runtimes/bun/cli-main.ts", ...args];
}

function start(
  command: readonly [string, ...string[]],
): ChildProcessWithoutNullStreams {
  const [executable, ...args] = command;
  return spawn(executable, args, {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
  });
}

async function waitForReady(child: ChildProcessWithoutNullStreams): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`server readiness deadline exceeded: ${stderr}`));
    }, DEADLINE_MS);
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
      const newline = stdout.indexOf("\n");
      if (newline < 0) return;
      clearTimeout(timer);
      try {
        const value = JSON.parse(stdout.slice(0, newline)) as unknown;
        if (
          typeof value !== "object" ||
          value === null ||
          !("ready" in value) ||
          value.ready !== true ||
          !("url" in value) ||
          typeof value.url !== "string"
        ) {
          reject(new Error(`invalid readiness message: ${stdout}`));
          return;
        }
        resolve(value.url);
      } catch (error) {
        reject(error);
      }
    });
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      reject(
        new Error(
          `server exited before readiness (code=${String(code)}, signal=${String(
            signal,
          )}): ${stderr}`,
        ),
      );
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function stop(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (code: number | null, signal: NodeJS.Signals | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.off("error", onError);
      if (code === 0 || signal === "SIGTERM") resolve();
      else {
        reject(
          new Error(
            `server shutdown failed (code=${String(code)}, signal=${String(signal)})`,
          ),
        );
      }
    };
    const onError = (error: Error): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.off("exit", finish);
      reject(error);
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.off("exit", finish);
      child.off("error", onError);
      child.kill("SIGKILL");
      reject(new Error("server shutdown deadline exceeded"));
    }, DEADLINE_MS);
    child.once("exit", finish);
    child.once("error", onError);
    if (child.exitCode !== null || child.signalCode !== null) {
      finish(child.exitCode, child.signalCode);
      return;
    }
    if (
      !child.kill("SIGTERM") &&
      child.exitCode === null &&
      child.signalCode === null
    ) {
      onError(new Error("could not signal server process"));
    }
  });
}

async function run(
  command: readonly [string, ...string[]],
): Promise<{ readonly stdout: string; readonly stderr: string }> {
  const child = start(command);
  child.stdin.end();
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });
  const code = await new Promise<number | null>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`client deadline exceeded: ${stderr}`));
    }, DEADLINE_MS);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (value) => {
      clearTimeout(timer);
      resolve(value);
    });
  });
  if (code !== 0) {
    throw new Error(`client failed with ${String(code)}: ${stderr}`);
  }
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

async function withServer(
  runtime: Runtime,
  backend: Backend,
  label: string,
  operation: (url: string) => Promise<void>,
): Promise<void> {
  const extension = backend === "sqlite" ? "db" : "md";
  const path = `${ROOT}/${label}-${runtime}-${backend}.${extension}`;
  await rm(path, { force: true });
  const child = start([
    ...serverCommand(runtime),
    "--backend",
    backend,
    "--data",
    path,
    "--port",
    "0",
  ]);
  try {
    await operation(await waitForReady(child));
  } finally {
    await stop(child);
  }
}

async function main(): Promise<void> {
  await mkdir(ROOT, { recursive: true });
  const runtimes: readonly Runtime[] = ["node", "deno", "bun"];
  const backends: readonly Backend[] = ["sqlite", "markdown"];
  let serverBackendCells = 0;
  for (const runtime of runtimes) {
    for (const backend of backends) {
      await withServer(runtime, backend, "server-backend", async (url) => {
        const client = new FetchTaskClient({ baseUrl: url, timeoutMs: 2_000 });
        assertEquals(await client.create({ title: `${runtime}-${backend}` }), {
          id: 1,
          title: `${runtime}-${backend}`,
          completed: false,
        });
      });
      serverBackendCells += 1;
    }
  }

  let clientServerCells = 0;
  for (const serverRuntime of runtimes) {
    await withServer(serverRuntime, "sqlite", "client-server", async (url) => {
      for (const clientRuntime of runtimes) {
        const result = await run(
          clientCommand(clientRuntime, url, `${clientRuntime}-to-${serverRuntime}`),
        );
        const task = JSON.parse(result.stdout) as unknown;
        assert(
          typeof task === "object" &&
            task !== null &&
            "title" in task &&
            task.title === `${clientRuntime}-to-${serverRuntime}`,
        );
        clientServerCells += 1;
      }
    });
  }
  assertEquals(serverBackendCells, 6);
  assertEquals(clientServerCells, 9);
  console.log(
    JSON.stringify({
      serverBackendCells,
      clientServerSqliteCells: clientServerCells,
    }),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
