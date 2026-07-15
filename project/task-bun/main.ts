// Bun CLI entrypoint. main() is exported and import.meta.main gates execution,
// so the module is import-safe for tests and only runs the CLI when invoked
// directly; the exit code flows through process.exitCode.
import { runCli } from "./cli.ts";

export async function main(
  args: readonly string[] = Bun.argv.slice(2),
): Promise<number> {
  return runCli(args);
}

if (import.meta.main) {
  process.exitCode = await main();
}
