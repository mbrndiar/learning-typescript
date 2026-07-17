import { IncompleteProjectError } from "../../core/index.ts";

export function denoCliMain(_args: readonly string[]): Promise<number> {
  return Promise.reject(new IncompleteProjectError("Deno CLI composition"));
}

if (import.meta.main) {
  try {
    Deno.exitCode = await denoCliMain(Deno.args);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exitCode = 1;
  }
}
