// Reference solution for the least-privilege Deno exercise. The output is a
// plan for authority, so every flag should map to one concrete capability.
export type DenoProgram =
  | { readonly kind: "file-cli"; readonly dataDirectory: string }
  | { readonly kind: "http-server"; readonly hostname: string; readonly port: number };

function permissionTarget(value: string, label: string): string {
  const unsafe = Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return character === "," || codePoint <= 0x1f || codePoint === 0x7f;
  });
  if (value.length === 0 || unsafe) {
    throw new TypeError(
      `${label} must be non-empty and contain no comma or control character`,
    );
  }
  return value;
}

function normalizedHostname(value: string): string {
  const hostname = permissionTarget(value, "hostname");
  let url: URL;
  try {
    url = new URL(`http://${hostname}`);
  } catch (error) {
    throw new TypeError("hostname must be a host name, IPv4 address, or bracketed IPv6 address", {
      cause: error,
    });
  }
  if (
    url.username !== "" ||
    url.password !== "" ||
    url.port !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new TypeError("hostname must not contain credentials, a port, path, query, or fragment");
  }
  return url.hostname;
}

// CONTRACT: choose only the permissions required by the selected program; the
// function itself stays pure and needs no permissions to test.
export function permissionFlags(program: DenoProgram): readonly string[] {
  if (program.kind === "file-cli") {
    // File CLIs need both read and write, but only inside their declared data
    // directory; no env or run access is implied.
    const dataDirectory = permissionTarget(program.dataDirectory, "dataDirectory");
    return [
      `--allow-read=${dataDirectory}`,
      `--allow-write=${dataDirectory}`,
    ];
  }
  // Validate before building --allow-net so an impossible or surprising
  // listener never becomes an authority string.
  if (!Number.isSafeInteger(program.port) || program.port < 0 || program.port > 65_535) {
    throw new RangeError("port must be an integer from 0 through 65535");
  }
  // Host plus port keeps network authority at the listener boundary instead
  // of granting every outbound connection.
  return [`--allow-net=${normalizedHostname(program.hostname)}:${program.port}`];
}

if (import.meta.main) {
  console.log(permissionFlags({ kind: "file-cli", dataDirectory: ".task-data" }).join(" "));
}
