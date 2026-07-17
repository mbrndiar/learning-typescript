import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";
import { FetchTaskClient } from "../solution/client/fetch.ts";
import { assert, assertEquals } from "./contracts.ts";

const ROOT = "projects/tasks/.test-data/interoperability";
const DEADLINE_MS = 10_000;
type Runtime = "node" | "deno" | "bun";
type Backend = "sqlite" | "markdown";

function optionalEnvironment(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.length === 0 ? undefined : value;
}

function denoDirectory(): string {
  const explicit = optionalEnvironment("DENO_DIR");
  if (explicit !== undefined) return explicit;
  if (process.platform === "win32") {
    const localAppData = optionalEnvironment("LOCALAPPDATA");
    if (localAppData === undefined) {
      throw new Error("DENO_DIR or LOCALAPPDATA must be set for Deno SQLite");
    }
    return join(localAppData, "deno");
  }
  if (process.platform === "darwin") {
    const home = optionalEnvironment("HOME");
    if (home === undefined) {
      throw new Error("DENO_DIR or HOME must be set for Deno SQLite");
    }
    return join(home, "Library", "Caches", "deno");
  }
  const cacheDirectory = optionalEnvironment("XDG_CACHE_HOME");
  if (cacheDirectory !== undefined) {
    return join(cacheDirectory, "deno");
  }
  const home = optionalEnvironment("HOME");
  if (home === undefined) {
    throw new Error("DENO_DIR, XDG_CACHE_HOME, or HOME must be set for Deno SQLite");
  }
  return join(home, ".cache", "deno");
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
      `--allow-read=${join(denoDirectory(), "plug")}`,
      "--allow-read=projects/tasks/.test-data/interoperability",
      `--allow-write=${join(denoDirectory(), "plug")}`,
      "--allow-write=projects/tasks/.test-data/interoperability",
      "--allow-env=DENO_DIR,XDG_CACHE_HOME,HOME,LOCALAPPDATA,DENO_SQLITE_PATH,DENO_SQLITE_LOCAL",
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
    let stdoutBuffer = "";
    let stdoutPrelude = "";
    let stderr = "";
    let settled = false;

    const cleanup = (): void => {
      clearTimeout(timer);
      child.stdout.off("data", onStdout);
      child.stderr.off("data", onStderr);
      child.off("exit", onExit);
      child.off("error", onError);
    };
    const fail = (error: Error): void => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const succeed = (url: string): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(url);
    };
    const onStderr = (chunk: string): void => {
      stderr += chunk;
    };
    const onStdout = (chunk: string): void => {
      stdoutBuffer += chunk;

      while (true) {
        const newline = stdoutBuffer.indexOf("\n");
        if (newline < 0) {
          if (stdoutBuffer.length > 16_384) {
            fail(new Error("server produced excessive output before readiness"));
          }
          return;
        }

        const line = stdoutBuffer.slice(0, newline).replace(/\r$/, "");
        stdoutBuffer = stdoutBuffer.slice(newline + 1);
        if (line.length === 0) continue;

        let value: unknown;
        try {
          value = JSON.parse(line);
        } catch {
          stdoutPrelude += `${line}\n`;
          if (stdoutPrelude.length > 16_384) {
            fail(new Error("server produced excessive output before readiness"));
          }
          continue;
        }

        if (
          typeof value === "object" &&
          value !== null &&
          "ready" in value &&
          value.ready === true &&
          "url" in value &&
          typeof value.url === "string"
        ) {
          succeed(value.url);
          return;
        }

        stdoutPrelude += `${line}\n`;
      }
    };
    const onExit = (code: number | null, signal: NodeJS.Signals | null): void => {
      fail(
        new Error(
          `server exited before readiness (code=${String(code)}, signal=${String(
            signal,
          )}): ${stderr}${stdoutPrelude}${stdoutBuffer}`,
        ),
      );
    };
    const onError = (error: Error): void => {
      fail(error);
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      fail(
        new Error(
          `server readiness deadline exceeded: ${stderr}${stdoutPrelude}${stdoutBuffer}`,
        ),
      );
    }, DEADLINE_MS);

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", onStderr);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", onStdout);
    child.once("exit", onExit);
    child.once("error", onError);
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
