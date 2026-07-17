import { IncompleteProjectError } from "../../core/index.ts";

export function bunCliMain(_args: readonly string[]): Promise<number> {
  return Promise.reject(new IncompleteProjectError("Bun CLI composition"));
}

if (import.meta.main) {
  try {
    process.exitCode = await bunCliMain(Bun.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
