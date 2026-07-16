import { access, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { setTimeout as delay } from "node:timers/promises";

const [databasePath, readyPath, releasePath] = process.argv.slice(2);
if (
  databasePath === undefined ||
  readyPath === undefined ||
  releasePath === undefined
) {
  process.exitCode = 1;
} else {
  let database: DatabaseSync | undefined;
  try {
    database = new DatabaseSync(databasePath, {
      enableForeignKeyConstraints: true,
      timeout: 10_000,
    });
    database.exec("PRAGMA busy_timeout = 10000; BEGIN IMMEDIATE");
    await writeFile(readyPath, "ready");
    while (!(await exists(releasePath))) {
      await delay(10);
    }
    database.exec("ROLLBACK");
  } catch {
    process.exitCode = 1;
  } finally {
    database?.close();
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
