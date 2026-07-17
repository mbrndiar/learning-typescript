import process from "node:process";
import { pathToFileURL } from "node:url";
import { IncompleteProjectError } from "../../core/index.ts";

export function nodeApiMain(_args: readonly string[]): Promise<number> {
  return Promise.reject(new IncompleteProjectError("Node API composition"));
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  nodeApiMain(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
