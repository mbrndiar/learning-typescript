interface AddCommand {
  readonly kind: "add";
  readonly title: string;
}

type Command = AddCommand | { readonly kind: "list" };

function parseCommand(args: readonly string[]): Command {
  const [name, ...rest] = args;
  if (name === "list" && rest.length === 0) {
    return { kind: "list" };
  }
  if (name === "add" && rest.length === 1 && rest[0]?.trim()) {
    return { kind: "add", title: rest[0].trim() };
  }
  throw new Error('usage: <add "title"> | <list>');
}

export function run(args: readonly string[]): number {
  try {
    const command = parseCommand(args);
    console.log(command.kind === "add" ? `Adding: ${command.title}` : "Listing tasks");
    return 0;
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    return 2;
  }
}

const suppliedArguments = process.argv.slice(2);
process.exitCode = run(suppliedArguments.length === 0 ? ["list"] : suppliedArguments);
