import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import test from "node:test";

import { NodeFileEventLog } from "../../solution/node/file-log.ts";
import { runM3AdapterContract } from "../contracts/m3-adapter.ts";

const root = "capstones/idiomatic/tests/.test-data/node";

test("m3-adapter: Node versioned file log", async () => {
  await runM3AdapterContract({
    root,
    createLog: (path, capacity) => new NodeFileEventLog(path, capacity),
    async writeText(path, text) {
      await mkdir(root, { recursive: true });
      await writeFile(path, text, "utf8");
    },
    readText: (path) => readFile(path, "utf8"),
    reset: () => rm(root, { recursive: true, force: true }),
  });
});
