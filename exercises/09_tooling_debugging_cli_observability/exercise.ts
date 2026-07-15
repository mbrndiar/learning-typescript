export type Command =
  | { readonly kind: "list"; readonly json: boolean }
  | { readonly kind: "add"; readonly title: string };

// CONTRACT: parse already-split argv tokens for task list/add. Do not read
// process.argv or exit here; the caller owns the process boundary.
export function parseArguments(_args: readonly string[]): Command {
  // TODO: reject unknown flags, missing titles, and extra values with a usage
  // error rather than guessing what the user meant.
  throw new Error("TODO: implement argument parsing");
}
