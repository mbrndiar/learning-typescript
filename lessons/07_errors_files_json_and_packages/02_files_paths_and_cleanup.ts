// File-system APIs are another runtime boundary: paths can differ by
// operating system, reads can fail, and cleanup must run even after errors.
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// mkdtemp gives this run its own directory; join avoids hard-coded path
// separators and keeps cleanup scoped to the files this lesson created.
const directory = await mkdtemp(join(tmpdir(), "learning-typescript-"));
const file = join(directory, "settings.json");

try {
  const settings = { theme: "dark", pageSize: 20 };
  await writeFile(file, `${JSON.stringify(settings, null, 2)}\n`, "utf8");

  const text = await readFile(file, "utf8");
  console.log(JSON.parse(text) as unknown);
} finally {
  // finally pairs acquisition with release, so failed writes or reads do not
  // leave lesson artifacts behind for the next run.
  await rm(directory, { recursive: true, force: true });
}
