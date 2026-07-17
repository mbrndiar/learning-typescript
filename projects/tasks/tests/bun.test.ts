import { mkdir, rm, writeFile, access } from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { StorageError } from "../solution/core/index.ts";
import { BunMarkdownRepository } from "../solution/runtimes/bun/markdown.ts";
import { BunSqliteRepository } from "../solution/runtimes/bun/sqlite.ts";
import { startBunServer } from "../solution/runtimes/bun/server.ts";
import { BunMarkdownRepository as StarterMarkdown } from "../starter/runtimes/bun/markdown.ts";
import { BunSqliteRepository as StarterSqlite } from "../starter/runtimes/bun/sqlite.ts";
import {
  assertRejects,
  cliContract,
  domainAndJsonContract,
  fetchClientContract,
  httpDispatchContract,
  markdownCorruptionContract,
  repositoryContract,
  serverContract,
  starterIncompleteContract,
} from "./contracts.ts";

const ROOT = "projects/tasks/.test-data/bun";

async function reset(path: string): Promise<void> {
  await mkdir(ROOT, { recursive: true });
  await rm(path, { force: true, recursive: true });
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe("shared contracts", () => {
  test("domain, service, and strict JSON", domainAndJsonContract);
  test("HTTP dispatch", httpDispatchContract);
  test("Fetch client", fetchClientContract);
  test("CLI", cliContract);
});

for (const [name, extension, create] of [
  ["Bun SQLite", "db", (path: string) => new BunSqliteRepository(path)],
  ["Bun Markdown", "md", (path: string) => new BunMarkdownRepository(path)],
] as const) {
  const path = `${ROOT}/repository-${extension}.${extension}`;
  test(`${name} repository contract`, () =>
    repositoryContract({
      name,
      path,
      create,
      reset: () => reset(path),
      writeText: (source) => writeFile(path, source, "utf8"),
    }));
}

test("Bun Markdown rejects corrupt persisted data", () => {
  const path = `${ROOT}/corrupt.md`;
  return markdownCorruptionContract({
    name: "Bun Markdown",
    path,
    create: (value) => new BunMarkdownRepository(value),
    reset: () => reset(path),
    writeText: (source) => writeFile(path, source, "utf8"),
  });
});

test("Bun SQLite rejects unsupported schema versions", async () => {
  const path = `${ROOT}/schema.db`;
  await reset(path);
  const database = new Database(path, { create: true, strict: true });
  database.exec("PRAGMA user_version = 99");
  database.close();
  await assertRejects(async () => new BunSqliteRepository(path), StorageError);
});

for (const [name, extension, create] of [
  ["Bun SQLite server", "db", (path: string) => new BunSqliteRepository(path)],
  ["Bun Markdown server", "md", (path: string) => new BunMarkdownRepository(path)],
] as const) {
  const path = `${ROOT}/server-${extension}.${extension}`;
  test(`${name} loopback contract`, () =>
    serverContract({
      name,
      path,
      createRepository: create,
      start: (service) => startBunServer({ service, port: 0 }),
      reset: () => reset(path),
    }));
}

for (const [name, extension, create] of [
  ["starter Bun SQLite", "db", (path: string) => new StarterSqlite(path)],
  ["starter Bun Markdown", "md", (path: string) => new StarterMarkdown(path)],
] as const) {
  const path = `${ROOT}/${name.replaceAll(" ", "-")}.${extension}`;
  test(`${name} is visibly incomplete without storage effects`, async () => {
    await reset(path);
    await starterIncompleteContract(create, path, () => exists(path));
    expect(await exists(path)).toBe(false);
  });
}
