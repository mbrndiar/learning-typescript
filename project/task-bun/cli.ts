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

// Bun CLI wiring: the composition root that maps parsed options to a backend
// and hands off to the shared runtime-neutral core. Only backend construction
// differs from Node and Deno; the rest backend reuses the same TaskClient over
// the Web-standard fetch.
function createStorage(options: CliOptions): TaskStorage {
  if (options.backend === "file") {
    return new BunFileTaskStorage(options.file);
  }
  return new RestTaskStorage(
    new TaskClient(options.url, fetch, options.timeoutMilliseconds),
  );
}

// IO and storage default to real console/backends but stay injectable so tests
// drive the CLI without touching stdout or the filesystem.
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
