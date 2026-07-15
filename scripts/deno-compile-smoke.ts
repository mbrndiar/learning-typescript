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
