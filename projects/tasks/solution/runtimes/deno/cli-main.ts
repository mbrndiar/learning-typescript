import { FetchTaskClient } from "../../client/fetch.ts";
import { runCli } from "../../core/cli.ts";

export function denoCliMain(args: readonly string[]): Promise<number> {
  return runCli(args, (configuration) => new FetchTaskClient(configuration), {
    stdout: (line) => console.log(line),
    stderr: (line) => console.error(line),
  });
}

if (import.meta.main) {
  Deno.exitCode = await denoCliMain(Deno.args);
}
