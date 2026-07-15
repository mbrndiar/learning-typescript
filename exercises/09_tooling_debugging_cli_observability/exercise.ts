export type Command =
  | { readonly kind: "list"; readonly json: boolean }
  | { readonly kind: "add"; readonly title: string };

export function parseArguments(_args: readonly string[]): Command {
  throw new Error("TODO: implement argument parsing");
}
