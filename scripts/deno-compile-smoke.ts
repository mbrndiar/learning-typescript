// Smoke test for `deno compile`: builds a self-contained executable of the Deno
// CLI to confirm compilation succeeds on this platform. The compiled binary
// bakes in least-privilege permissions (read/write scoped to .task-data only),
// and the generated executable and directory are always removed in finally so
// the working tree stays clean.
const output = Deno.build.os === "windows" ? "compiled/task-deno.exe" : "compiled/task-deno";

await Deno.mkdir("compiled", { recursive: true });

try {
  const status = await new Deno.Command(Deno.execPath(), {
    args: [
      "compile",
      "--quiet",
      "--output",
      output,
      "--allow-read=.task-data",
      "--allow-write=.task-data",
      "project/task-deno/main.ts",
    ],
    stdin: "null",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn().status;

  if (!status.success) {
    throw new Error(`deno compile exited with code ${status.code}`);
  }
  console.log("Deno executable compile smoke passed");
} finally {
  await Deno.remove(output).catch((error: unknown) => {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  });
  await Deno.remove("compiled").catch((error: unknown) => {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  });
}
