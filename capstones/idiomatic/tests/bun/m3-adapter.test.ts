import { afterAll, test } from "bun:test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";

import { BunFileEventLog } from "../../solution/bun/file-log.ts";
import { runM3AdapterContract } from "../contracts/m3-adapter.ts";

const root = "capstones/idiomatic/tests/.test-data/bun";

afterAll(() => rm(root, { recursive: true, force: true }));

test("m3-adapter: Bun versioned file log", async () => {
  await runM3AdapterContract({
    root,
    createLog: (path, capacity) => new BunFileEventLog(path, capacity),
    async writeText(path, text) {
      await mkdir(root, { recursive: true });
      await writeFile(path, text, "utf8");
    },
    readText: (path) => readFile(path, "utf8"),
    reset: () => rm(root, { recursive: true, force: true }),
  });
});
