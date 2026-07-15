import { TaskClient } from "../task-client/client.ts";
import {
  type CliIo,
  type CliOptions,
  parseCli,
  runCliCore,
  type StorageFactory,
} from "../task-core/cli-core.ts";
import type { TaskStorage } from "../task-core/storage.ts";
import { RestTaskStorage } from "../task-client/rest-storage.ts";
import { BunFileTaskStorage } from "./bun-file-storage.ts";

function createStorage(options: CliOptions): TaskStorage {
  if (options.backend === "file") {
    return new BunFileTaskStorage(options.file);
  }
  return new RestTaskStorage(
    new TaskClient(options.url, fetch, options.timeoutMilliseconds),
  );
}

export async function runCli(
  args: readonly string[],
  io: CliIo = {
    stdout: (text) => console.log(text),
    stderr: (text) => console.error(text),
  },
  storageFactory: StorageFactory = createStorage,
): Promise<number> {
  return runCliCore(args, io, storageFactory);
}

export { parseCli };
export type { CliIo, CliOptions };
