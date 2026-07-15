import { runCli } from "./cli.ts";

export async function main(
  args: readonly string[] = Bun.argv.slice(2),
): Promise<number> {
  return runCli(args);
}

if (import.meta.main) {
  process.exitCode = await main();
}
