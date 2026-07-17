// Runs the Deno chapter and the portable module 16 material under the real Deno
// CLI. Each CourseFile records not just its path but the exact minimal
// permissions and env it needs, so the runner grants least privilege per file
// rather than a blanket --allow-all, mirroring how the course teaches Deno's
// deny-by-default security model.
interface CourseFile {
  readonly path: string;
  readonly mode: "run" | "test";
  readonly permissions?: readonly string[];
  readonly config?: string;
  readonly env?: Record<string, string>;
}

async function directoryExists(path: string): Promise<boolean> {
  try {
    return (await Deno.stat(path)).isDirectory;
  } catch (error: unknown) {
    if (error instanceof Deno.errors.NotFound) {
      return false;
    }
    throw error;
  }
}

// Module 16 is runtime-portable, so its lesson files, exercise solutions, and
// portable-check scripts all run as plain programs (no per-file permissions);
// exercise starters are excluded since only solutions are expected to run.
async function collectPortableModule16(): Promise<CourseFile[]> {
  const files: CourseFile[] = [];
  for (const root of ["lessons", "exercises"]) {
    for await (const entry of Deno.readDir(root)) {
      if (!entry.isDirectory || !entry.name.startsWith("16_")) {
        continue;
      }
      const directory = `${root}/${entry.name}`;
      if (!(await directoryExists(directory))) {
        continue;
      }
      for await (const child of Deno.readDir(directory)) {
        if (!child.isFile || !/\.(?:js|ts)$/.test(child.name)) {
          continue;
        }
        const isPortableCheck = child.name === "portable-check.ts" ||
          child.name === "portable-check.js";
        const isSolution = /^solution\.(?:js|ts)$/.test(child.name);
        if (root === "lessons" || isSolution || isPortableCheck) {
          files.push({
            path: `${directory}/${child.name}`,
            mode: "run",
          });
        }
      }
    }
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

// Spawns `deno run|test` with the file's declared flags, inheriting stdio but
// closing stdin so an interactive prompt cannot hang the run. A non-zero exit
// aborts the whole course run so failures are never swallowed.
function runCourseFile(file: CourseFile): Promise<void> {
  const args: string[] = [file.mode];
  if (file.config !== undefined) {
    args.push(`--config=${file.config}`);
  }
  args.push(...(file.permissions ?? []), file.path);

  console.log(`\n=== deno ${args.join(" ")} ===`);
  const child = new Deno.Command(Deno.execPath(), {
    args,
    env: file.env,
    stdin: "null",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();

  return child.status.then((status) => {
    if (!status.success) {
      throw new Error(`${file.path} exited with code ${status.code}`);
    }
  });
}

// Module 14 files are listed explicitly because each needs a hand-picked set of
// permissions (scoped read/write dirs, a single env var, loopback-only net, or
// permission to re-invoke deno); module 16 is appended via the portable
// collector. import.meta.main keeps this importable without executing.
export async function runDenoCourse(): Promise<void> {
  const config = "deno.json";
  const files: CourseFile[] = [
    {
      path: "lessons/14_deno_runtime/01_configuration_and_toolchain.ts",
      mode: "run",
      config,
    },
    {
      path: "lessons/14_deno_runtime/02_permissions_and_native_apis.ts",
      mode: "run",
      config,
      permissions: [
        "--allow-read=lessons/14_deno_runtime/.lesson-data",
        "--allow-write=lessons/14_deno_runtime/.lesson-data",
        "--allow-env=DENO_COURSE_DIR",
        "--allow-run=deno",
      ],
      env: { DENO_COURSE_DIR: "lessons/14_deno_runtime/.lesson-data" },
    },
    {
      path: "lessons/14_deno_runtime/03_deno_testing.test.ts",
      mode: "test",
      config,
    },
    {
      path: "lessons/14_deno_runtime/04_serve_and_compile.ts",
      mode: "run",
      config,
      permissions: ["--allow-net=127.0.0.1"],
    },
    {
      path: "exercises/14_deno_runtime/solution.ts",
      mode: "run",
    },
    {
      path: "exercises/14_deno_runtime/solution.test.ts",
      mode: "test",
    },
    ...(await collectPortableModule16()),
  ];

  for (const file of files) {
    await runCourseFile(file);
  }
}

if (import.meta.main) {
  await runDenoCourse();
}
