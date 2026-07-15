import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { spawn } from "node:child_process";

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)));
    } else {
      files.push(path);
    }
  }

  return files;
}

function runFile(file: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n=== ${file} ===`);
    const child = spawn(process.execPath, ["--import=tsx", file], {
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal !== null) {
        reject(new Error(`${file} terminated by ${signal}`));
      } else if (code !== 0) {
        reject(new Error(`${file} exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

const lessonFiles = (await collectFiles("lessons")).filter((file) => {
  const extension = extname(file);
  return (extension === ".js" || extension === ".ts") && !file.endsWith(".test.ts");
});

const solutionFiles = (await collectFiles("exercises")).filter((file) =>
  /[/\\]solution\.(?:js|ts)$/.test(file),
);

for (const file of [...lessonFiles, ...solutionFiles].sort()) {
  await runFile(file);
}
