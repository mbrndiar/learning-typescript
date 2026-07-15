import { runCli } from "./cli.ts";

if (import.meta.main) {
  Deno.exitCode = await runCli(Deno.args);
}
