import { TaskManager } from "./manager.ts";
import type { TaskStorage } from "./storage.ts";

// cli-core is the runtime-neutral CLI: it parses argv and runs commands but
// never touches process, files, or fetch directly. Each runtime supplies IO and
// a storage factory, so argument parsing and command dispatch are tested once
// and shared by the Node, Deno, and Bun entrypoints.

export interface CliOptions {
  readonly backend: "file" | "rest";
  readonly file: string;
  readonly url: URL;
  readonly timeoutMilliseconds: number;
}

export type CliCommand =
  | { readonly kind: "list" }
  | { readonly kind: "add"; readonly title: string }
  | { readonly kind: "complete"; readonly id: number }
  | { readonly kind: "remove"; readonly id: number };

export interface ParsedCli {
  readonly options: CliOptions;
  readonly command: CliCommand;
}

// CliIo abstracts stdout/stderr so the core stays free of runtime globals and
// tests can capture output without touching the real streams.
export interface CliIo {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
}

// The factory is injected because constructing a backend requires runtime
// authority (file access, network) that the neutral core deliberately lacks.
export type StorageFactory = (options: CliOptions) => TaskStorage;

const usage =
  'usage: task-manager [--backend file|rest] [--file path] [--url URL] [--timeout ms] <list|add "title"|complete id|remove id>';

function takeValue(args: readonly string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (value === undefined) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

/**
 * Parses argv into validated options and a command. Flags are validated at this
 * boundary (backend enum, positive timeout, well-formed URL) so downstream code
 * never sees malformed input, and unexpected extra arguments fail loudly.
 */
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
    command = { kind: name, id: Number(value) };
  } else {
    throw new Error(usage);
  }

  return {
    options: { backend, file, url, timeoutMilliseconds },
    command,
  };
}

/**
 * Runs a parsed command and returns a process exit code. All errors are routed
 * to stderr and mapped to exit code 1 here, so each runtime entrypoint only has
 * to forward the code rather than duplicate error handling.
 */
export async function runCliCore(
  args: readonly string[],
  io: CliIo,
  storageFactory: StorageFactory,
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
