// Deno CLI entrypoint. The import.meta.main guard keeps this import-safe: the
// module can be imported by tests without launching the CLI, and only runs when
// executed directly. Deno.exitCode carries the core's exit code.
import { runCli } from "./cli.ts";

if (import.meta.main) {
  Deno.exitCode = await runCli(Deno.args);
}
