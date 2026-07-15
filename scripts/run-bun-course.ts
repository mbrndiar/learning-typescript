const repositoryRoot = import.meta.dir.replace(/[/\\]scripts$/, "");

async function collectTypeScript(directory: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const glob = new Bun.Glob("**/*.ts");
    for await (const file of glob.scan({
      cwd: `${repositoryRoot}/${directory}`,
      absolute: true,
      onlyFiles: true,
    })) {
      files.push(file);
    }
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }
    throw error;
  }
  return files.sort();
}

function isBunPortable(file: string): boolean {
  return !/\.(?:deno|node)\.test\.ts$/.test(file);
}

function displayPath(file: string): string {
  return file.startsWith(`${repositoryRoot}/`)
    ? file.slice(repositoryRoot.length + 1)
    : file;
}

async function runFile(file: string): Promise<void> {
  const isTest = file.endsWith(".test.ts");
  const command = isTest
    ? [process.execPath, "test", file]
    : [process.execPath, "run", file];
  console.log(`\n=== ${displayPath(file)} ===`);
  const subprocess = Bun.spawn({
    cmd: command,
    cwd: repositoryRoot,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await subprocess.exited;
  if (exitCode !== 0) {
    throw new Error(`${displayPath(file)} exited with code ${exitCode}`);
  }
}

export async function runBunCourse(): Promise<void> {
  const lesson14 = await collectTypeScript("lessons/14_bun_runtime");
  const exercise14 = (await collectTypeScript("exercises/14_bun_runtime")).filter(
    (file) => file.endsWith("/solution.ts") || file.endsWith(".test.ts"),
  );
  const lesson15 = (await collectTypeScript("lessons/15_runtime_portability")).filter(
    isBunPortable,
  );
  const exercise15 = (
    await collectTypeScript("exercises/15_runtime_portability")
  ).filter(
    (file) =>
      isBunPortable(file) &&
      (file.endsWith("/solution.ts") || file.endsWith(".test.ts")),
  );

  const files = [...lesson14, ...exercise14, ...lesson15, ...exercise15];
  if (files.length === 0) {
    throw new Error("no Bun course files were found");
  }

  for (const file of files) {
    await runFile(file);
  }
}

if (import.meta.main) {
  await runBunCourse();
}
