export type Command =
  | { readonly kind: "list"; readonly json: boolean }
  | { readonly kind: "add"; readonly title: string };

// CONTRACT: parse already-split argv tokens for task list/add. Do not read
// process.argv or exit here; the caller owns the process boundary.
export function parseArguments(args: readonly string[]): Command {
  const [command, ...rest] = args;
  if (command === "list") {
    if (rest.length === 0) {
      return { kind: "list", json: false };
    }
    if (rest.length === 1 && rest[0] === "--json") {
      return { kind: "list", json: true };
    }
    // --json belongs only to list, and extra tokens likely mean the shell
    // command was malformed, so fail loudly at the boundary.
    throw new Error("usage: task list [--json]");
  }

  if (
    command === "add" &&
    rest.length === 1 &&
    rest[0]?.trim() &&
    !rest[0].startsWith("--")
  ) {
    // Normalize the title once, where untrusted argv becomes a typed command.
    return { kind: "add", title: rest[0].trim() };
  }

  throw new Error("usage: task add <title> | task list [--json]");
}
