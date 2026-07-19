import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { selectExerciseTarget } from "../test-target.ts";

const implementation =
  selectExerciseTarget(process.env.EXERCISE_IMPLEMENTATION) === "exercise"
    ? await import("./filesystem-exercise.ts")
    : await import("./filesystem-solution.ts");
const { listJsonFiles, readJsonDocument, writeJsonDocument } = implementation;

test("filesystem boundary writes, lists, and reads owned JSON files", async () => {
  const root = await mkdtemp(join(tmpdir(), "learning-typescript-files-"));
  const records = join(root, "records");
  try {
    const second = await writeJsonDocument(records, "b.json", { id: 2 });
    const first = await writeJsonDocument(records, "a.json", { id: 1 });
    await writeFile(join(records, "notes.txt"), "not JSON\n", "utf8");
    await mkdir(join(records, "nested"));
    await writeFile(join(records, "nested", "ignored.json"), "{}\n", "utf8");

    assert.deepEqual(await listJsonFiles(records), ["a.json", "b.json"]);
    assert.deepEqual(await readJsonDocument(first), { id: 1 });
    assert.equal(await readFile(second, "utf8"), '{"id":2}\n');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("filesystem boundary rejects traversal, missing paths, and malformed UTF-8", async () => {
  const root = await mkdtemp(join(tmpdir(), "learning-typescript-files-"));
  try {
    await assert.rejects(
      writeJsonDocument(root, "../escape.json", { unsafe: true }),
      /local .json file name/,
    );
    await assert.rejects(listJsonFiles(join(root, "missing")));

    const invalid = join(root, "invalid.json");
    await writeFile(invalid, Uint8Array.of(0xff));
    await assert.rejects(readJsonDocument(invalid), /valid UTF-8/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
