import { DenoFileEventLog } from "../../solution/deno/file-log.ts";
import { runM3AdapterContract } from "../contracts/m3-adapter.ts";

const root = "capstones/idiomatic/tests/.test-data/deno";

Deno.test({
  name: "m3-adapter: Deno versioned file log",
  permissions: {
    read: ["capstones/idiomatic/tests/.test-data/deno"],
    write: ["capstones/idiomatic/tests/.test-data/deno"],
  },
  async fn() {
    await runM3AdapterContract({
      root,
      createLog: (path, capacity) => new DenoFileEventLog(path, capacity),
      async writeText(path, text) {
        await Deno.mkdir(root, { recursive: true });
        await Deno.writeTextFile(path, text);
      },
      readText: Deno.readTextFile,
      async reset() {
        await Deno.remove(root, { recursive: true }).catch((error: unknown) => {
          if (!(error instanceof Deno.errors.NotFound)) {
            throw error;
          }
        });
      },
    });
  },
});

Deno.test({
  name: "m3-adapter: Deno does not widen missing file permissions",
  permissions: "none",
  async fn() {
    const log = new DenoFileEventLog(
      "capstones/idiomatic/tests/fixtures/corrupt-bad-header.jsonl",
    );
    try {
      for await (const _event of log.replay({})) {
        // A denied read must fail before an event can be produced.
      }
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "log_io"
      ) {
        return;
      }
      throw error;
    } finally {
      await log.close();
    }
    throw new Error("Deno file adapter unexpectedly widened read permission");
  },
});
