// CONTRACT: create `directory`, write one new UTF-8 JSON document named
// `fileName`, terminate it with one newline, and return the created path.
export async function writeJsonDocument(
  _directory: string,
  _fileName: string,
  _value: unknown,
): Promise<string> {
  throw new Error("TODO: create the directory and write the JSON document");
}

// CONTRACT: return sorted names of regular .json files directly inside the
// directory. Ignore subdirectories and non-JSON entries.
export async function listJsonFiles(_directory: string): Promise<readonly string[]> {
  throw new Error("TODO: list regular JSON files deterministically");
}

// CONTRACT: read raw bytes, reject malformed UTF-8, and parse the JSON as
// unknown. Do not assert a domain type at the file boundary.
export async function readJsonDocument(_path: string): Promise<unknown> {
  throw new Error("TODO: decode and parse the JSON document");
}
