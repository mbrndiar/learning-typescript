import process from "node:process";
import { pathToFileURL } from "node:url";
import { TaskService } from "../../core/index.ts";
import { parseApiArguments } from "../../core/runtime.ts";
import { openNodeRepository } from "./repository.ts";
import { startNodeServer } from "./server.ts";

export async function nodeApiMain(args: readonly string[]): Promise<number> {
  const configuration = parseApiArguments(args, "node");
  const repository = openNodeRepository(configuration.backend, configuration.dataPath);
  try {
    const server = await startNodeServer({
      service: new TaskService(repository),
      hostname: configuration.hostname,
      port: configuration.port,
    });
    console.log(JSON.stringify({ ready: true, url: server.url }));
    await new Promise<void>((resolve, reject) => {
      const stop = (): void => resolve();
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
      server.finished.then(resolve, reject);
    });
    await server.close();
    return 0;
  } finally {
    await repository.close();
  }
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  nodeApiMain(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    },
  );
}
