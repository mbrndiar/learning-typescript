// Reference solution for the least-privilege Deno exercise. The output is a
// plan for authority, so every flag should map to one concrete capability.
export type DenoProgram =
  | { readonly kind: "file-cli"; readonly dataDirectory: string }
  | { readonly kind: "http-server"; readonly hostname: string; readonly port: number };

// CONTRACT: choose only the permissions required by the selected program; the
// function itself stays pure and needs no permissions to test.
export function permissionFlags(program: DenoProgram): readonly string[] {
  if (program.kind === "file-cli") {
    // File CLIs need both read and write, but only inside their declared data
    // directory; no env or run access is implied.
    return [
      `--allow-read=${program.dataDirectory}`,
      `--allow-write=${program.dataDirectory}`,
    ];
  }
  // Validate before building --allow-net so an impossible or surprising
  // listener never becomes an authority string.
  if (!Number.isSafeInteger(program.port) || program.port < 0 || program.port > 65_535) {
    throw new RangeError("port must be an integer from 0 through 65535");
  }
  // Host plus port keeps network authority at the listener boundary instead
  // of granting every outbound connection.
  return [`--allow-net=${program.hostname}:${program.port}`];
}

if (import.meta.main) {
  console.log(permissionFlags({ kind: "file-cli", dataDirectory: ".task-data" }).join(" "));
}
