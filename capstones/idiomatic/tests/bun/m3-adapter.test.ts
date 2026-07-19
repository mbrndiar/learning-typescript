import { afterAll, test } from "bun:test";
import { mkdir, readFile, rm } from "node:fs/promises";

import { runM3AdapterContract } from "../contracts/m3-adapter.ts";
import { loadBunIdiomaticTarget, selectedBunImplementation } from "./implementation.ts";

const root = "capstones/idiomatic/tests/.test-data/bun";

afterAll(() => rm(root, { recursive: true, force: true }));

test("m3-adapter: Bun versioned file log", async () => {
  const target = await loadBunIdiomaticTarget(selectedBunImplementation());
  await runM3AdapterContract({
    root,
    createLog: target.createFileLog,
    async writeText(path, text) {
      await mkdir(root, { recursive: true });
      await Bun.write(path, text);
    },
    async writeBytes(path, bytes) {
      await mkdir(root, { recursive: true });
      await Bun.write(path, bytes);
    },
    readText: (path) => readFile(path, "utf8"),
    reset: () => rm(root, { recursive: true, force: true }),
  });
});
