import { TaskService } from "../../core/index.ts";
import { parseApiArguments } from "../../core/runtime.ts";
import { openDenoRepository } from "./repository.ts";
import { startDenoServer } from "./server.ts";

export async function denoApiMain(args: readonly string[]): Promise<number> {
  const configuration = parseApiArguments(args, "deno");
  const repository = await openDenoRepository(
    configuration.backend,
    configuration.dataPath,
  );
  try {
    const server = await startDenoServer({
      service: new TaskService(repository),
      hostname: configuration.hostname,
      port: configuration.port,
    });
    console.log(JSON.stringify({ ready: true, url: server.url }));
    await new Promise<void>((resolve, reject) => {
      const stop = (): void => resolve();
      Deno.addSignalListener("SIGINT", stop);
      Deno.addSignalListener("SIGTERM", stop);
      server.finished.then(resolve, reject);
    });
    await server.close();
    return 0;
  } finally {
    await repository.close();
  }
}

if (import.meta.main) {
  try {
    Deno.exitCode = await denoApiMain(Deno.args);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exitCode = 1;
  }
}
