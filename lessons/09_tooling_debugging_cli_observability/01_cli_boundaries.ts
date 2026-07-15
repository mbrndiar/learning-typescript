// CLIs are program boundaries: raw argv strings enter from the shell and must
// be validated before the rest of the program receives typed commands.
interface AddCommand {
  readonly kind: "add";
  readonly title: string;
}

type Command = AddCommand | { readonly kind: "list" };

// CONTRACT: convert argv tokens into one supported command or throw a usage
// error that the outer run function can translate into an exit code.
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

// run returns an exit code instead of terminating the process. That keeps CLI
// behavior testable and gives callers a chance to flush output or clean up.
export function run(args: readonly string[]): number {
  try {
    const command = parseCommand(args);
    console.log(command.kind === "add" ? `Adding: ${command.title}` : "Listing tasks");
    return 0;
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    // Exit code 2 conventionally means command-line usage was invalid.
    return 2;
  }
}

// Only the top level reads process globals; the rest of the program works with
// ordinary values.
const suppliedArguments = process.argv.slice(2);
process.exitCode = run(suppliedArguments.length === 0 ? ["list"] : suppliedArguments);
