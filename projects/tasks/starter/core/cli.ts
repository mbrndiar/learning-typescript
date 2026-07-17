import { IncompleteProjectError, type TaskClient } from "./index.ts";

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
export function runCli(
  _args: readonly string[],
  _createClient: CliClientFactory,
  _io: CliIo,
): Promise<number> {
  return Promise.reject(new IncompleteProjectError("CLI policy"));
}
