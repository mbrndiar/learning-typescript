import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = await mkdtemp(join(tmpdir(), "learning-typescript-"));
const file = join(directory, "settings.json");

try {
  const settings = { theme: "dark", pageSize: 20 };
  await writeFile(file, `${JSON.stringify(settings, null, 2)}\n`, "utf8");

  const text = await readFile(file, "utf8");
  console.log(JSON.parse(text) as unknown);
} finally {
  await rm(directory, { recursive: true, force: true });
}
