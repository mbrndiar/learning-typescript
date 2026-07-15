export type DenoProgram =
  | { readonly kind: "file-cli"; readonly dataDirectory: string }
  | { readonly kind: "http-server"; readonly hostname: string; readonly port: number };

export function permissionFlags(program: DenoProgram): readonly string[] {
  // TODO: Return only the permissions needed by the selected program.
  throw new Error(`not implemented: ${program.kind}`);
}
