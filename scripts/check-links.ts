import { stat, readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

async function collectMarkdown(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") {
      continue;
    }
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdown(path)));
    } else if (entry.name.endsWith(".md")) {
      files.push(path);
    }
  }

  return files;
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }
    throw error;
  }
}

const failures: string[] = [];
const linkPattern = /\[[^\]]*]\(([^)]+)\)/g;

for (const file of await collectMarkdown(".")) {
  const text = await readFile(file, "utf8");
  for (const match of text.matchAll(linkPattern)) {
    const target = match[1]?.trim();
    if (
      target === undefined ||
      target === "" ||
      target.startsWith("#") ||
      /^[a-z][a-z\d+.-]*:/i.test(target)
    ) {
      continue;
    }

    const pathPart = decodeURIComponent(target.split("#", 1)[0] ?? "");
    const localPath = resolve(dirname(file), pathPart);
    if (!(await exists(localPath))) {
      failures.push(`${file}: missing ${target}`);
    }
  }
}

if (failures.length > 0) {
  throw new Error(`broken local Markdown links:\n${failures.join("\n")}`);
}

console.log("local Markdown links are valid");
