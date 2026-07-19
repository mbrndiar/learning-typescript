// Migration becomes safer when runtime authority is represented by narrow
// adapters. The application can then depend on "files" and "commands" without
// importing Node, Deno, or Bun APIs in the migration target.
interface RuntimeFiles {
  readonly name: string;
  readText(path: string): Promise<string>;
  writeText(path: string, contents: string): Promise<void>;
}

interface RuntimeCommands {
  readonly name: string;
  run(command: string, args: readonly string[]): Promise<number>;
}

interface ApplicationRuntime {
  readonly files: RuntimeFiles;
  readonly commands: RuntimeCommands;
}

// CONTRACT: copy configuration through the injected runtime boundary and
// normalize the trailing newline. This function should not know whether the
// adapters are backed by node:fs, Deno APIs, Bun APIs, or a test double.
async function exportConfiguration(
  runtime: ApplicationRuntime,
  source: string,
  destination: string,
): Promise<void> {
  const text = await runtime.files.readText(source);
  await runtime.files.writeText(destination, text.replace(/[\r\n]+$/u, "") + "\n");
  const exitCode = await runtime.commands.run("echo", [
    `exported with ${runtime.files.name}`,
  ]);
  if (exitCode !== 0) {
    throw new Error(`${runtime.commands.name} command failed`);
  }
}

// The in-memory adapters are deliberately boring: they prove the boundary is
// behavioral. Real adapters can change later while this application function
// keeps the same contract.
const memory = new Map([["config.json", '{"runtime":"portable"}  \r\n\r\n']]);
const demonstration: ApplicationRuntime = {
  files: {
    name: "injected file adapter",
    async readText(path) {
      const value = memory.get(path);
      if (value === undefined) {
        throw new Error(`${path} was not found`);
      }
      return value;
    },
    async writeText(path, contents) {
      memory.set(path, contents);
    },
  },
  commands: {
    name: "injected command adapter",
    async run(command, args) {
      console.log(command, ...args);
      return 0;
    },
  },
};

await exportConfiguration(demonstration, "config.json", "exported.json");
const exported = memory.get("exported.json");
if (exported !== '{"runtime":"portable"}  \n') {
  throw new Error(
    "adapter must preserve trailing spaces while normalizing line endings",
  );
}
console.log(exported);

export { exportConfiguration };
export type { ApplicationRuntime, RuntimeCommands, RuntimeFiles };
