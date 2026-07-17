import process from "node:process";
import { pathToFileURL } from "node:url";
import { IncompleteProjectError } from "../../core/index.ts";

export function nodeCliMain(_args: readonly string[]): Promise<number> {
  return Promise.reject(new IncompleteProjectError("Node CLI composition"));
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  nodeCliMain(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
