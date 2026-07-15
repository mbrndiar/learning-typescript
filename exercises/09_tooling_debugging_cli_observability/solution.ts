export type Command =
  | { readonly kind: "list"; readonly json: boolean }
  | { readonly kind: "add"; readonly title: string };

export function parseArguments(args: readonly string[]): Command {
  const [command, ...rest] = args;
  if (command === "list") {
    if (rest.length === 0) {
      return { kind: "list", json: false };
    }
    if (rest.length === 1 && rest[0] === "--json") {
      return { kind: "list", json: true };
    }
    throw new Error("usage: task list [--json]");
  }

  if (
    command === "add" &&
    rest.length === 1 &&
    rest[0]?.trim() &&
    !rest[0].startsWith("--")
  ) {
    return { kind: "add", title: rest[0].trim() };
  }

  throw new Error("usage: task add <title> | task list [--json]");
}
