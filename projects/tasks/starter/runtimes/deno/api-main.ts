import { IncompleteProjectError } from "../../core/index.ts";

export function denoApiMain(_args: readonly string[]): Promise<number> {
  return Promise.reject(new IncompleteProjectError("Deno API composition"));
}

if (import.meta.main) {
  try {
    Deno.exitCode = await denoApiMain(Deno.args);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exitCode = 1;
  }
}
