import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

function jsonFilePath(directory: string, fileName: string): string {
  if (
    fileName.length === 0 ||
    basename(fileName) !== fileName ||
    extname(fileName).toLowerCase() !== ".json"
  ) {
    throw new TypeError("fileName must be one local .json file name");
  }
  return join(directory, fileName);
}

export async function writeJsonDocument(
  directory: string,
  fileName: string,
  value: unknown,
): Promise<string> {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new TypeError("value must be JSON-serializable");
  }
  const path = jsonFilePath(directory, fileName);
  await mkdir(directory, { recursive: true });
  await writeFile(path, `${serialized}\n`, { encoding: "utf8", flag: "wx" });
  return path;
}

export async function listJsonFiles(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".json")
    .map((entry) => entry.name)
    .sort();
}

export async function readJsonDocument(path: string): Promise<unknown> {
  const bytes = await readFile(path);
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new TypeError("file must contain valid UTF-8", { cause: error });
  }
  return JSON.parse(text) as unknown;
}
