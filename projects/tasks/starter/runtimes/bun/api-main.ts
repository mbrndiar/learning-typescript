import { IncompleteProjectError } from "../../core/index.ts";

export function bunApiMain(_args: readonly string[]): Promise<number> {
  return Promise.reject(new IncompleteProjectError("Bun API composition"));
}

if (import.meta.main) {
  try {
    process.exitCode = await bunApiMain(Bun.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
