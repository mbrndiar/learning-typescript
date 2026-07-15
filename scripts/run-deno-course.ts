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

async function collectPortableModule15(): Promise<CourseFile[]> {
  const files: CourseFile[] = [];
  for (const root of ["lessons", "exercises"]) {
    for await (const entry of Deno.readDir(root)) {
      if (!entry.isDirectory || !entry.name.startsWith("15_")) {
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
        const isTest = child.name.endsWith(".test.ts") || child.name.endsWith(".test.js");
        const isSolution = /^solution\.(?:js|ts)$/.test(child.name);
        if (root === "lessons" || isSolution || isTest) {
          files.push({
            path: `${directory}/${child.name}`,
            mode: isTest ? "test" : "run",
          });
        }
      }
    }
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

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

export async function runDenoCourse(): Promise<void> {
  const config = "deno.json";
  const files: CourseFile[] = [
    {
      path: "lessons/13_deno_runtime/01_configuration_and_toolchain.ts",
      mode: "run",
      config,
    },
    {
      path: "lessons/13_deno_runtime/02_permissions_and_native_apis.ts",
      mode: "run",
      config,
      permissions: [
        "--allow-read=lessons/13_deno_runtime/.lesson-data",
        "--allow-write=lessons/13_deno_runtime/.lesson-data",
        "--allow-env=DENO_COURSE_DIR",
        "--allow-run=deno",
      ],
      env: { DENO_COURSE_DIR: "lessons/13_deno_runtime/.lesson-data" },
    },
    {
      path: "lessons/13_deno_runtime/03_deno_testing.test.ts",
      mode: "test",
      config,
    },
    {
      path: "lessons/13_deno_runtime/04_serve_and_compile.ts",
      mode: "run",
      config,
      permissions: ["--allow-net=127.0.0.1"],
    },
    {
      path: "exercises/13_deno_runtime/solution.ts",
      mode: "run",
    },
    {
      path: "exercises/13_deno_runtime/solution.test.ts",
      mode: "test",
    },
    ...(await collectPortableModule15()),
  ];

  for (const file of files) {
    await runCourseFile(file);
  }
}

if (import.meta.main) {
  await runDenoCourse();
}
