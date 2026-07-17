import { ValidationError } from "./index.ts";

export type BackendName = "sqlite" | "markdown";

export interface ApiConfiguration {
  readonly backend: BackendName;
  readonly dataPath: string;
  readonly hostname: string;
  readonly port: number;
}

function optionValue(args: readonly string[], index: number): string {
  const value = args[index + 1];
  if (value === undefined) {
    throw new ValidationError(`missing value for ${args[index] ?? "option"}`);
  }
  return value;
}

export function parseApiArguments(
  args: readonly string[],
  runtime: "node" | "deno" | "bun",
): ApiConfiguration {
  let backend: BackendName = "sqlite";
  let dataPath = `tasks-${runtime}.db`;
  let hostname = "127.0.0.1";
  let port = 8000;
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = optionValue(args, index);
    if (option === "--backend" && (value === "sqlite" || value === "markdown")) {
      backend = value;
    } else if (option === "--data") {
      dataPath = value;
    } else if (option === "--host") {
      hostname = value;
    } else if (option === "--port") {
      port = Number(value);
      if (!Number.isInteger(port) || port < 0 || port > 65_535) {
        throw new ValidationError("port must be an integer from 0 through 65535");
      }
    } else {
      throw new ValidationError(`unknown option or value: ${option} ${value}`);
    }
  }
  return Object.freeze({ backend, dataPath, hostname, port });
}

export interface RunningServer {
  readonly url: string;
  readonly finished: Promise<void>;
  close(): Promise<void>;
}

export function formatServerUrl(hostname: string, port: number): string {
  const host =
    hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname
      : hostname.includes(":")
        ? `[${hostname}]`
        : hostname;
  return `http://${host}:${port}`;
}
