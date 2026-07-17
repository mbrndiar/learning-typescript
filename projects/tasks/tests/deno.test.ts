import { Database } from "jsr:@db/sqlite@0.13.0";
import { StorageError } from "../solution/core/index.ts";
import { DenoMarkdownRepository } from "../solution/runtimes/deno/markdown.ts";
import { DenoSqliteRepository } from "../solution/runtimes/deno/sqlite.ts";
import { startDenoServer } from "../solution/runtimes/deno/server.ts";
import { DenoMarkdownRepository as StarterMarkdown } from "../starter/runtimes/deno/markdown.ts";
import { DenoSqliteRepository as StarterSqlite } from "../starter/runtimes/deno/sqlite.ts";
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

const ROOT = "projects/tasks/.test-data/deno";

async function reset(path: string): Promise<void> {
  await Deno.mkdir(ROOT, { recursive: true });
  try {
    await Deno.remove(path, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

Deno.test("shared domain, service, and strict JSON contract", domainAndJsonContract);
Deno.test("shared HTTP dispatch contract", httpDispatchContract);
Deno.test("shared Fetch client contract", fetchClientContract);
Deno.test("shared CLI contract", cliContract);

for (const [name, extension, create] of [
  ["Deno SQLite", "db", (path: string) => new DenoSqliteRepository(path)],
  ["Deno Markdown", "md", (path: string) => new DenoMarkdownRepository(path)],
] as const) {
  const path = `${ROOT}/repository-${extension}.${extension}`;
  Deno.test(`${name} repository contract`, () =>
    repositoryContract({
      name,
      path,
      create,
      reset: () => reset(path),
      writeText: (source) => Deno.writeTextFile(path, source),
    }),
  );
}

Deno.test("Deno Markdown rejects corrupt persisted data", () => {
  const path = `${ROOT}/corrupt.md`;
  return markdownCorruptionContract({
    name: "Deno Markdown",
    path,
    create: (value) => new DenoMarkdownRepository(value),
    reset: () => reset(path),
    writeText: (source) => Deno.writeTextFile(path, source),
  });
});

Deno.test("Deno SQLite rejects unsupported schema versions", async () => {
  const path = `${ROOT}/schema.db`;
  await reset(path);
  const database = new Database(path);
  database.exec("PRAGMA user_version = 99");
  database.close();
  await assertRejects(async () => new DenoSqliteRepository(path), StorageError);
});

Deno.test("Deno SQLite rejects IDs outside the safe integer range", async () => {
  const path = `${ROOT}/unsafe-id.db`;
  await reset(path);
  const repository = new DenoSqliteRepository(path);
  await repository.close();
  const database = new Database(path, { int64: true });
  const statement = database.prepare(
    "INSERT INTO tasks(id, title, completed) VALUES (?, ?, 0)",
  );
  try {
    statement.run(9_007_199_254_740_992n, "Unsafe");
  } finally {
    try {
      statement.finalize();
    } finally {
      database.close();
    }
  }
  const reopened = new DenoSqliteRepository(path);
  try {
    await assertRejects(() => reopened.list({}), StorageError);
  } finally {
    await reopened.close();
  }
});

for (const [name, extension, create] of [
  ["Deno SQLite server", "db", (path: string) => new DenoSqliteRepository(path)],
  ["Deno Markdown server", "md", (path: string) => new DenoMarkdownRepository(path)],
] as const) {
  const path = `${ROOT}/server-${extension}.${extension}`;
  Deno.test(`${name} loopback contract`, () =>
    serverContract({
      name,
      path,
      createRepository: create,
      start: (service) => startDenoServer({ service, port: 0 }),
      reset: () => reset(path),
    }),
  );
}

for (const [name, extension, create] of [
  ["starter Deno SQLite", "db", (path: string) => new StarterSqlite(path)],
  ["starter Deno Markdown", "md", (path: string) => new StarterMarkdown(path)],
] as const) {
  const path = `${ROOT}/${name.replaceAll(" ", "-")}.${extension}`;
  Deno.test(`${name} is visibly incomplete without storage effects`, async () => {
    await reset(path);
    await starterIncompleteContract(create, path, () => exists(path));
  });
}
