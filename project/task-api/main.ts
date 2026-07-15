import { once } from "node:events";

import { createTaskServer } from "./server.ts";
import { SqliteTaskStorage } from "./sqlite-storage.ts";

const database = new SqliteTaskStorage(process.env.TASK_DATABASE ?? "tasks.db");
const server = createTaskServer(database);
const port = Number(process.env.PORT ?? "8080");

server.listen(port, "127.0.0.1");
await once(server, "listening");
console.log(`task API listening on http://127.0.0.1:${port}`);

let closing = false;
async function shutdown(signal: string): Promise<void> {
  if (closing) {
    return;
  }
  closing = true;
  console.log(`received ${signal}; shutting down`);
  const forceClose = setTimeout(() => server.closeAllConnections(), 5_000);
  forceClose.unref();
  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  } finally {
    clearTimeout(forceClose);
    database.close();
  }
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdown(signal).catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    });
  });
}
