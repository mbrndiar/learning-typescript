import { DenoFileTaskStorage } from "./file-storage.ts";
import { serveTaskApi } from "./server.ts";

interface ServerArguments {
  readonly file: string;
  readonly hostname: string;
  readonly port: number;
}

export function parseServerArguments(args: readonly string[]): ServerArguments {
  let file = ".task-data/tasks.json";
  let hostname = "127.0.0.1";
  let port = 8080;

  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (value === undefined) {
      throw new Error(`${flag ?? "option"} requires a value`);
    }
    if (flag === "--file") {
      file = value;
    } else if (flag === "--hostname") {
      hostname = value;
    } else if (flag === "--port") {
      port = Number(value);
      if (!Number.isSafeInteger(port) || port < 0 || port > 65_535) {
        throw new Error("--port must be an integer from 0 through 65535");
      }
    } else {
      throw new Error(`unknown option: ${flag}`);
    }
  }
  return { file, hostname, port };
}

export async function main(args: readonly string[] = Deno.args): Promise<void> {
  const options = parseServerArguments(args);
  const controller = new AbortController();
  const server = serveTaskApi(new DenoFileTaskStorage(options.file), {
    hostname: options.hostname,
    port: options.port,
    signal: controller.signal,
  });
  const signals: readonly Deno.Signal[] = Deno.build.os === "windows"
    ? ["SIGINT"]
    : ["SIGINT", "SIGTERM"];
  let resolveShutdown: () => void = () => undefined;
  const shutdown = new Promise<void>((resolve) => {
    resolveShutdown = resolve;
  });
  const onSignal = (): void => resolveShutdown();

  try {
    for (const signal of signals) {
      Deno.addSignalListener(signal, onSignal);
    }
    await shutdown;
  } finally {
    for (const signal of signals) {
      Deno.removeSignalListener(signal, onSignal);
    }
    controller.abort();
    await server.finished;
  }
}

if (import.meta.main) {
  try {
    await main();
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exitCode = 1;
  }
}
