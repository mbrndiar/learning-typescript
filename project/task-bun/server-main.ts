import { BunSqliteTaskStorage } from "./bun-sqlite-storage.ts";
import { createBunTaskServer } from "./server.ts";

export async function main(): Promise<void> {
  const port = Number(Bun.env.PORT ?? "8080");
  if (!Number.isSafeInteger(port) || port < 0 || port > 65_535) {
    throw new RangeError("PORT must be an integer between 0 and 65535");
  }

  const storage = new BunSqliteTaskStorage(Bun.env.TASK_DATABASE ?? "tasks.sqlite");
  const server = createBunTaskServer(storage, { port });
  console.log(`task API listening at ${server.url}`);

  try {
    await new Promise<void>((resolve) => {
      const shutdown = (): void => resolve();
      process.once("SIGINT", shutdown);
      process.once("SIGTERM", shutdown);
    });
  } finally {
    await server.stop();
    storage.close();
  }
}

if (import.meta.main) {
  await main();
}
