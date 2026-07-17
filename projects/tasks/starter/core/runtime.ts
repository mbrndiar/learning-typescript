import { IncompleteProjectError } from "./index.ts";

export type BackendName = "sqlite" | "markdown";
export interface ApiConfiguration {
  readonly backend: BackendName;
  readonly dataPath: string;
  readonly hostname: string;
  readonly port: number;
}
export interface RunningServer {
  readonly url: string;
  readonly finished: Promise<void>;
  close(): Promise<void>;
}
export function parseApiArguments(
  _args: readonly string[],
  _runtime: "node" | "deno" | "bun",
): ApiConfiguration {
  throw new IncompleteProjectError("server argument parsing");
}
export function formatServerUrl(hostname: string, port: number): string {
  const host = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname
    : hostname.includes(":")
    ? `[${hostname}]`
    : hostname;
  return `http://${host}:${port}`;
}
