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

async function exportConfiguration(
  runtime: ApplicationRuntime,
  source: string,
  destination: string,
): Promise<void> {
  const text = await runtime.files.readText(source);
  await runtime.files.writeText(destination, text.trimEnd() + "\n");
  const exitCode = await runtime.commands.run("echo", [
    `exported with ${runtime.files.name}`,
  ]);
  if (exitCode !== 0) {
    throw new Error(`${runtime.commands.name} command failed`);
  }
}

const memory = new Map([["config.json", '{"runtime":"portable"}']]);
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
console.log(memory.get("exported.json"));

export { exportConfiguration };
export type { ApplicationRuntime, RuntimeCommands, RuntimeFiles };
