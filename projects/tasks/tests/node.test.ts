import { access, mkdir, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import * as solutionCore from "../solution/core/index.ts";
import { NodeMarkdownRepository } from "../solution/runtimes/node/markdown.ts";
import { NodeSqliteRepository } from "../solution/runtimes/node/sqlite.ts";
import { startNodeServer } from "../solution/runtimes/node/server.ts";
import * as starterCore from "../starter/core/index.ts";
import { NodeMarkdownRepository as StarterMarkdown } from "../starter/runtimes/node/markdown.ts";
import { NodeSqliteRepository as StarterSqlite } from "../starter/runtimes/node/sqlite.ts";
import { StorageError } from "../solution/core/index.ts";
import {
  assertEquals,
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

const ROOT = "projects/tasks/.test-data/node";

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

test("shared domain, service, and strict JSON contract", domainAndJsonContract);
test("shared HTTP dispatch contract", httpDispatchContract);
test("shared Fetch client contract", fetchClientContract);
test("shared CLI contract", cliContract);

test("starter and solution core exports stay aligned", () => {
  assertEquals(Object.keys(starterCore).sort(), Object.keys(solutionCore).sort());
});

for (const [name, extension, create] of [
  ["Node SQLite", "db", (path: string) => new NodeSqliteRepository(path)],
  ["Node Markdown", "md", (path: string) => new NodeMarkdownRepository(path)],
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

test("Node Markdown rejects corrupt persisted data", () => {
  const path = `${ROOT}/corrupt.md`;
  return markdownCorruptionContract({
    name: "Node Markdown",
    path,
    create: (value) => new NodeMarkdownRepository(value),
    reset: () => reset(path),
    writeText: (source) => writeFile(path, source, "utf8"),
  });
});

test("Node SQLite rejects unsupported schema versions", async () => {
  const path = `${ROOT}/schema.db`;
  await reset(path);
  const database = new DatabaseSync(path);
  database.exec("PRAGMA user_version = 99");
  database.close();
  await assertRejects(async () => new NodeSqliteRepository(path), StorageError);
});

test("Node SQLite rejects IDs outside the safe integer range", async () => {
  const path = `${ROOT}/unsafe-id.db`;
  await reset(path);
  const repository = new NodeSqliteRepository(path);
  await repository.close();
  const database = new DatabaseSync(path);
  database
    .prepare("INSERT INTO tasks(id, title, completed) VALUES (?, ?, 0)")
    .run(9_007_199_254_740_992n, "Unsafe");
  database.close();
  const reopened = new NodeSqliteRepository(path);
  try {
    await assertRejects(() => reopened.list({}), StorageError);
  } finally {
    await reopened.close();
  }
});

for (const [name, extension, create] of [
  ["Node SQLite server", "db", (path: string) => new NodeSqliteRepository(path)],
  ["Node Markdown server", "md", (path: string) => new NodeMarkdownRepository(path)],
] as const) {
  const path = `${ROOT}/server-${extension}.${extension}`;
  test(`${name} loopback contract`, () =>
    serverContract({
      name,
      path,
      createRepository: create,
      start: (service) => startNodeServer({ service, port: 0 }),
      reset: () => reset(path),
    }));
}

for (const [name, extension, create] of [
  ["starter Node SQLite", "db", (path: string) => new StarterSqlite(path)],
  ["starter Node Markdown", "md", (path: string) => new StarterMarkdown(path)],
] as const) {
  const path = `${ROOT}/${name.replaceAll(" ", "-")}.${extension}`;
  test(`${name} is visibly incomplete without storage effects`, async () => {
    await reset(path);
    await starterIncompleteContract(create, path, () => exists(path));
  });
}
