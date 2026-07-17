import process from "node:process";
import { pathToFileURL } from "node:url";
import { FetchTaskClient } from "../../client/fetch.ts";
import { runCli } from "../../core/cli.ts";

export function nodeCliMain(args: readonly string[]): Promise<number> {
  return runCli(args, (configuration) => new FetchTaskClient(configuration), {
    stdout: (line) => console.log(line),
    stderr: (line) => console.error(line),
  });
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && import.meta.url === pathToFileURL(invokedPath).href) {
  nodeCliMain(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
