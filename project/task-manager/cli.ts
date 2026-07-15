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
import { FileTaskStorage } from "./file-storage.ts";

// The Node CLI wiring: it is the composition root that maps parsed options to a
// concrete backend, then hands everything to the runtime-neutral core. The file
// backend runs in-process; the rest backend talks to a server via the injected
// global fetch, keeping this entrypoint thin.
function createStorage(options: CliOptions): TaskStorage {
  if (options.backend === "file") {
    return new FileTaskStorage(options.file);
  }
  return new RestTaskStorage(
    new TaskClient(options.url, fetch, options.timeoutMilliseconds),
  );
}

// IO and storage default to real console/backends but are injectable so tests
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
