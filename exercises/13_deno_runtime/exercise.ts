// Starter for a least-privilege planner: turn a program description into the
// narrow Deno flags it needs, not into broad ambient authority.
export type DenoProgram =
  | { readonly kind: "file-cli"; readonly dataDirectory: string }
  | { readonly kind: "http-server"; readonly hostname: string; readonly port: number };

// CONTRACT: return deterministic flags for the selected program and reject
// listener ports that cannot be represented safely.
export function permissionFlags(program: DenoProgram): readonly string[] {
  // TODO: Return only the permissions needed by the selected program.
  throw new Error(`not implemented: ${program.kind}`);
}
