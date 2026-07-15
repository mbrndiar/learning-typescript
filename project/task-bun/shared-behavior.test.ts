import { expect, test } from "bun:test";

import { TaskManager } from "../task-core/manager.ts";
import { BunFileTaskStorage } from "./bun-file-storage.ts";
import { createArtifactDirectory, removeArtifactDirectory } from "./test-support.ts";

// A real Bun file backend behind TaskManager must enforce the same domain rules
// as any other backend, confirming validation lives in the core, not the adapter.
test("Bun adapters preserve runtime-neutral TaskManager validation", async () => {
  const directory = await createArtifactDirectory("shared-manager");
  try {
    const manager = new TaskManager(new BunFileTaskStorage(`${directory}/tasks.json`));

    expect(await manager.add("  Shared behavior  ")).toEqual({
      id: 1,
      title: "Shared behavior",
      completed: false,
    });
    expect(() => manager.add(" ")).toThrow(/blank/);
    expect(() => manager.complete(0)).toThrow(/positive integer/);
  } finally {
    await removeArtifactDirectory(directory);
  }
});

// Importing the entrypoints must not start the CLI or bind a server; the
// import.meta.main guards make them side-effect-free to import, which is what
// lets tests exercise main() directly.
test("Bun entry points are import-safe", async () => {
  const cliEntry = await import("./main.ts");
  const serverEntry = await import("./server-main.ts");

  expect(cliEntry.main).toBeFunction();
  expect(serverEntry.main).toBeFunction();
});
