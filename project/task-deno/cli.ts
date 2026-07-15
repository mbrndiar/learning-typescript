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
import { DenoFileTaskStorage } from "./file-storage.ts";

// Deno CLI wiring: the composition root that selects a backend from parsed
// options and delegates to the shared runtime-neutral core. The file backend
// uses Deno-native APIs; the rest backend reuses the same TaskClient over the
// Web-standard fetch, so only backend construction differs from Node.
function createStorage(options: CliOptions): TaskStorage {
  if (options.backend === "file") {
    return new DenoFileTaskStorage(options.file);
  }
  return new RestTaskStorage(
    new TaskClient(options.url, fetch, options.timeoutMilliseconds),
  );
}

// IO and storage default to real console/backends but stay injectable so tests
// drive the CLI without touching stdout or the filesystem.
export function runCli(
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
