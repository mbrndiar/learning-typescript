export type DenoProgram =
  | { readonly kind: "file-cli"; readonly dataDirectory: string }
  | { readonly kind: "http-server"; readonly hostname: string; readonly port: number };

export function permissionFlags(program: DenoProgram): readonly string[] {
  if (program.kind === "file-cli") {
    return [
      `--allow-read=${program.dataDirectory}`,
      `--allow-write=${program.dataDirectory}`,
    ];
  }
  if (!Number.isSafeInteger(program.port) || program.port < 0 || program.port > 65_535) {
    throw new RangeError("port must be an integer from 0 through 65535");
  }
  return [`--allow-net=${program.hostname}:${program.port}`];
}

if (import.meta.main) {
  console.log(permissionFlags({ kind: "file-cli", dataDirectory: ".task-data" }).join(" "));
}
