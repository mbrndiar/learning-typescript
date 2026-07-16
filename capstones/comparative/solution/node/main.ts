import { main as runApplication } from "../src/index.ts";

export function main(
  arguments_: readonly string[] = process.argv.slice(2),
): Promise<number> {
  return runApplication(arguments_);
}

if (import.meta.main) {
  process.exitCode = await main();
}
