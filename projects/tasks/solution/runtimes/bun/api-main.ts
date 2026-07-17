import { TaskService } from "../../core/index.ts";
import { parseApiArguments } from "../../core/runtime.ts";
import { openBunRepository } from "./repository.ts";
import { startBunServer } from "./server.ts";

export async function bunApiMain(args: readonly string[]): Promise<number> {
  const configuration = parseApiArguments(args, "bun");
  const repository = openBunRepository(configuration.backend, configuration.dataPath);
  try {
    const server = startBunServer({
      service: new TaskService(repository),
      hostname: configuration.hostname,
      port: configuration.port,
    });
    console.log(JSON.stringify({ ready: true, url: server.url }));
    await new Promise<void>((resolve) => {
      process.once("SIGINT", resolve);
      process.once("SIGTERM", resolve);
    });
    await server.close();
    return 0;
  } finally {
    await repository.close();
  }
}

if (import.meta.main) {
  try {
    process.exitCode = await bunApiMain(Bun.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
