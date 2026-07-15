import { TaskClient } from "../task-client/client.ts";
import { FileTaskStorage } from "./file-storage.ts";
import { TaskManager } from "./manager.ts";
import { RestTaskStorage } from "./rest-storage.ts";
import type { TaskStorage } from "./storage.ts";

interface CliOptions {
  readonly backend: "file" | "rest";
  readonly file: string;
  readonly url: URL;
  readonly timeoutMilliseconds: number;
}

type CliCommand =
  | { readonly kind: "list" }
  | { readonly kind: "add"; readonly title: string }
  | { readonly kind: "complete"; readonly id: number }
  | { readonly kind: "remove"; readonly id: number };

interface ParsedCli {
  readonly options: CliOptions;
  readonly command: CliCommand;
}

export interface CliIo {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
}

const usage =
  'usage: task-manager [--backend file|rest] [--file path] [--url URL] [--timeout ms] <list|add "title"|complete id|remove id>';

function takeValue(args: readonly string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (value === undefined) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

export function parseCli(args: readonly string[]): ParsedCli {
  let backend: CliOptions["backend"] = "file";
  let file = "tasks.json";
  let url = new URL("http://127.0.0.1:8080");
  let timeoutMilliseconds = 5_000;
  let index = 0;

  while (true) {
    const flag = args[index];
    if (flag === undefined || !flag.startsWith("--")) {
      break;
    }
    const value = takeValue(args, index, flag);
    if (flag === "--backend") {
      if (value !== "file" && value !== "rest") {
        throw new Error("--backend must be file or rest");
      }
      backend = value;
    } else if (flag === "--file") {
      file = value;
    } else if (flag === "--url") {
      url = new URL(value);
    } else if (flag === "--timeout") {
      timeoutMilliseconds = Number(value);
      if (!Number.isSafeInteger(timeoutMilliseconds) || timeoutMilliseconds <= 0) {
        throw new Error("--timeout must be a positive integer");
      }
    } else {
      throw new Error(`unknown option: ${flag}`);
    }
    index += 2;
  }

  const [name, value, ...extra] = args.slice(index);
  if (extra.length > 0) {
    throw new Error(usage);
  }

  let command: CliCommand;
  if (name === "list" && value === undefined) {
    command = { kind: "list" };
  } else if (name === "add" && value !== undefined) {
    command = { kind: "add", title: value };
  } else if ((name === "complete" || name === "remove") && value !== undefined) {
    const id = Number(value);
    command = { kind: name, id };
  } else {
    throw new Error(usage);
  }

  return {
    options: { backend, file, url, timeoutMilliseconds },
    command,
  };
}

function createStorage(options: CliOptions): TaskStorage {
  if (options.backend === "file") {
    return new FileTaskStorage(options.file);
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
  storageFactory: (options: CliOptions) => TaskStorage = createStorage,
): Promise<number> {
  try {
    const parsed = parseCli(args);
    const manager = new TaskManager(storageFactory(parsed.options));

    if (parsed.command.kind === "list") {
      const tasks = await manager.list();
      for (const task of tasks) {
        io.stdout(`${task.id}\t${task.completed ? "done" : "pending"}\t${task.title}`);
      }
    } else if (parsed.command.kind === "add") {
      const task = await manager.add(parsed.command.title);
      io.stdout(`added task ${task.id}`);
    } else if (parsed.command.kind === "complete") {
      const task = await manager.complete(parsed.command.id);
      io.stdout(`completed task ${task.id}`);
    } else {
      await manager.remove(parsed.command.id);
      io.stdout(`removed task ${parsed.command.id}`);
    }
    return 0;
  } catch (error: unknown) {
    io.stderr(error instanceof Error ? error.message : String(error));
    return 1;
  }
}
