function optionalEnvironment(name: string): string | undefined {
  const value = Deno.env.get(name);
  return value === undefined || value.length === 0 ? undefined : value;
}

function requiredEnvironment(name: string): string {
  const value = optionalEnvironment(name);
  if (value === undefined) {
    throw new Error(`set ${name} or DENO_DIR before running Tasks Deno tests`);
  }
  return value;
}

function defaultDenoDirectory(): string {
  const explicit = optionalEnvironment("DENO_DIR");
  if (explicit !== undefined) return explicit;

  if (Deno.build.os === "windows") {
    return `${requiredEnvironment("LOCALAPPDATA")}\\deno`;
  }
  if (Deno.build.os === "darwin") {
    return `${requiredEnvironment("HOME")}/Library/Caches/deno`;
  }
  const cacheDirectory = optionalEnvironment("XDG_CACHE_HOME");
  return `${cacheDirectory ?? `${requiredEnvironment("HOME")}/.cache`}/deno`;
}

const denoDirectory = defaultDenoDirectory();
const pluginDirectory = `${denoDirectory}${Deno.build.os === "windows" ? "\\" : "/"}plug`;
const command = new Deno.Command("deno", {
  args: [
    "test",
    "--lock=deno.lock",
    `--allow-read=${pluginDirectory}`,
    "--allow-read=projects/tasks/docs/openapi.yaml",
    "--allow-read=projects/tasks/.test-data/deno",
    `--allow-write=${pluginDirectory}`,
    "--allow-write=projects/tasks/.test-data/deno",
    "--allow-net=127.0.0.1,github.com,release-assets.githubusercontent.com",
    "--allow-env=TASKS_IMPLEMENTATION,DENO_DIR,XDG_CACHE_HOME,HOME,LOCALAPPDATA,DENO_SQLITE_PATH,DENO_SQLITE_LOCAL",
    "--allow-ffi",
    "projects/tasks/tests/deno.test.ts",
  ],
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const status = await command.spawn().status;
if (!status.success) Deno.exit(status.code);
