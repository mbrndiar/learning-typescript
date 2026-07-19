import { runM3AdapterContract } from "../contracts/m3-adapter.ts";
import { loadDenoIdiomaticTarget, selectedDenoImplementation } from "./implementation.ts";

const root = "capstones/idiomatic/tests/.test-data/deno";

Deno.test({
  name: "m3-adapter: Deno versioned file log",
  permissions: {
    read: ["capstones/idiomatic/tests/.test-data/deno"],
    write: ["capstones/idiomatic/tests/.test-data/deno"],
    env: ["CAPSTONE_IMPLEMENTATION"],
  },
  async fn() {
    const target = await loadDenoIdiomaticTarget(selectedDenoImplementation());
    await runM3AdapterContract({
      root,
      createLog: target.createFileLog,
      async writeText(path, text) {
        await Deno.mkdir(root, { recursive: true });
        await Deno.writeTextFile(path, text);
      },
      async writeBytes(path, bytes) {
        await Deno.mkdir(root, { recursive: true });
        await Deno.writeFile(path, bytes);
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
  permissions: { env: ["CAPSTONE_IMPLEMENTATION"] },
  async fn() {
    const target = await loadDenoIdiomaticTarget(selectedDenoImplementation());
    const log = target.createFileLog("capstones/idiomatic/tests/fixtures/corrupt-bad-header.jsonl");
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
