// File-system APIs are another runtime boundary: paths can differ by
// operating system, reads can fail, and cleanup must run even after errors.
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// mkdtemp gives this run its own directory; join avoids hard-coded path
// separators and keeps cleanup scoped to the files this lesson created.
const directory = await mkdtemp(join(tmpdir(), "learning-typescript-"));
const incoming = join(directory, "incoming");
const archive = join(directory, "archive");
const sourceFile = join(incoming, "settings.json");
const copiedFile = join(archive, "settings-copy.json");
const archivedFile = join(archive, "settings.json");

try {
  await mkdir(incoming, { recursive: true });
  await mkdir(archive, { recursive: true });
  const settings = { theme: "dark", pageSize: 20 };
  await writeFile(sourceFile, `${JSON.stringify(settings, null, 2)}\n`, "utf8");

  const bytes = await readFile(sourceFile);
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  console.log(JSON.parse(text) as unknown);

  await copyFile(sourceFile, copiedFile);
  await rename(copiedFile, archivedFile);
  const entries = await readdir(archive, { withFileTypes: true });
  console.log(
    entries.map((entry) => `${entry.isFile() ? "file" : "other"}:${entry.name}`).sort(),
  );
} finally {
  // finally pairs acquisition with release, so failed writes or reads do not
  // leave lesson artifacts behind for the next run.
  await rm(directory, { recursive: true, force: true });
}
