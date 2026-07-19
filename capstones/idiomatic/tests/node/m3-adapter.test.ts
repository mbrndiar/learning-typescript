import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import test from "node:test";

import { runM3AdapterContract } from "../contracts/m3-adapter.ts";
import {
  loadNodeIdiomaticTarget,
  selectedNodeImplementation,
} from "./implementation.ts";

const root = "capstones/idiomatic/tests/.test-data/node";

test("m3-adapter: Node versioned file log", async () => {
  const target = await loadNodeIdiomaticTarget(selectedNodeImplementation());
  await runM3AdapterContract({
    root,
    createLog: target.createFileLog,
    async writeText(path, text) {
      await mkdir(root, { recursive: true });
      await writeFile(path, text, "utf8");
    },
    async writeBytes(path, bytes) {
      await mkdir(root, { recursive: true });
      await writeFile(path, bytes);
    },
    readText: (path) => readFile(path, "utf8"),
    reset: () => rm(root, { recursive: true, force: true }),
  });
});
