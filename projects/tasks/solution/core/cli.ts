import {
  ApiError,
  ClientProtocolError,
  ClientTransportError,
  type TaskClient,
  type UpdateTaskDto,
  validateTaskId,
  ValidationError,
} from "./index.ts";

export const CLI_EXIT = Object.freeze({
  success: 0,
  usage: 2,
  api: 3,
  protocol: 4,
  transport: 5,
});

export interface CliClientConfiguration {
  readonly baseUrl: string;
  readonly timeoutMs: number;
}

export type CliClientFactory = (configuration: CliClientConfiguration) => TaskClient;

export interface CliIo {
  readonly stdout: (line: string) => void;
  readonly stderr: (line: string) => void;
}

type Command =
  | Readonly<{ name: "add"; title: string }>
  | Readonly<{ name: "list"; completed?: boolean }>
  | Readonly<{ name: "show"; id: number }>
  | Readonly<{ name: "update"; id: number; update: UpdateTaskDto }>
  | Readonly<{ name: "complete"; id: number }>
  | Readonly<{ name: "remove"; id: number }>;

class CliUsageError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "CliUsageError";
  }
}

function parseBoolean(value: string | undefined): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new CliUsageError("completed must be true or false");
}

function parseId(value: string | undefined): number {
  try {
    return validateTaskId(value);
  } catch (error) {
    throw new CliUsageError("id must be a positive integer", { cause: error });
  }
}

function parseCommand(args: readonly string[]): Command {
  const [name, ...rest] = args;
  if (name === "add") {
    if (rest.length !== 1 || rest[0] === undefined) {
      throw new CliUsageError("usage: add TITLE");
    }
    return Object.freeze({ name, title: rest[0] });
  }
  if (name === "list") {
    if (rest.length === 0) return Object.freeze({ name });
    if (rest.length === 2 && rest[0] === "--completed") {
      return Object.freeze({ name, completed: parseBoolean(rest[1]) });
    }
    throw new CliUsageError("usage: list [--completed true|false]");
  }
  if (name === "show" || name === "complete" || name === "remove") {
    if (rest.length !== 1) {
      throw new CliUsageError(`usage: ${name} ID`);
    }
    return Object.freeze({ name, id: parseId(rest[0]) });
  }
  if (name === "update") {
    if (rest.length < 3) {
      throw new CliUsageError(
        "usage: update ID [--title TITLE] [--completed true|false]",
      );
    }
    const id = parseId(rest[0]);
    const update: { title?: string; completed?: boolean } = {};
    for (let index = 1; index < rest.length; index += 2) {
      const option = rest[index];
      const value = rest[index + 1];
      if (value === undefined) {
        throw new CliUsageError(`missing value for ${option ?? "option"}`);
      }
      if (option === "--title" && update.title === undefined) {
        update.title = value;
      } else if (option === "--completed" && update.completed === undefined) {
        update.completed = parseBoolean(value);
      } else {
        throw new CliUsageError(`unknown or repeated update option: ${option}`);
      }
    }
    return Object.freeze({ name, id, update: Object.freeze(update) });
  }
  throw new CliUsageError(
    "usage: add|list|show|update|complete|remove (use the project README)",
  );
}

function parseArguments(args: readonly string[]): {
  readonly configuration: CliClientConfiguration;
  readonly command: Command;
} {
  let baseUrl = "http://127.0.0.1:8000";
  let timeoutMs = 5_000;
  let index = 0;
  while (args[index]?.startsWith("--")) {
    const option = args[index];
    const value = args[index + 1];
    if (value === undefined) throw new CliUsageError(`missing value for ${option}`);
    if (option === "--base-url") {
      baseUrl = value;
    } else if (option === "--timeout") {
      const seconds = Number(value);
      if (!Number.isFinite(seconds) || seconds <= 0) {
        throw new CliUsageError("timeout must be a positive finite number");
      }
      timeoutMs = seconds * 1_000;
    } else {
      throw new CliUsageError(`unknown option: ${option}`);
    }
    index += 2;
  }
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
  } catch (error) {
    throw new CliUsageError("base URL must be a valid HTTP URL", { cause: error });
  }
  return Object.freeze({
    configuration: Object.freeze({ baseUrl, timeoutMs }),
    command: parseCommand(args.slice(index)),
  });
}

async function execute(client: TaskClient, command: Command): Promise<unknown> {
  if (command.name === "add") return client.create({ title: command.title });
  if (command.name === "list") {
    return client.list(
      command.completed === undefined ? {} : { completed: command.completed },
    );
  }
  if (command.name === "show") return client.get(command.id);
  if (command.name === "update") return client.update(command.id, command.update);
  if (command.name === "complete") {
    return client.update(command.id, { completed: true });
  }
  await client.delete(command.id);
  return { deleted: command.id };
}

export async function runCli(
  args: readonly string[],
  createClient: CliClientFactory,
  io: CliIo,
): Promise<number> {
  try {
    const parsed = parseArguments(args);
    const result = await execute(createClient(parsed.configuration), parsed.command);
    io.stdout(JSON.stringify(result));
    return CLI_EXIT.success;
  } catch (error) {
    if (error instanceof CliUsageError || error instanceof ValidationError) {
      io.stderr(`usage: ${error.message}`);
      return CLI_EXIT.usage;
    }
    if (error instanceof ApiError) {
      io.stderr(`api:${error.code}: ${error.message}`);
      return CLI_EXIT.api;
    }
    if (error instanceof ClientProtocolError) {
      io.stderr(`protocol: ${error.message}`);
      return CLI_EXIT.protocol;
    }
    if (error instanceof ClientTransportError) {
      io.stderr(`transport: ${error.message}`);
      return CLI_EXIT.transport;
    }
    io.stderr("protocol: unexpected client failure");
    return CLI_EXIT.protocol;
  }
}
