import {
  access,
  lstat,
  mkdir,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import * as solutionClient from "../solution/client/fetch.ts";
import * as solutionCli from "../solution/core/cli.ts";
import * as solutionCore from "../solution/core/index.ts";
import * as solutionHttp from "../solution/core/http.ts";
import * as solutionJson from "../solution/core/json.ts";
import * as solutionRuntime from "../solution/core/runtime.ts";
import * as solutionBun from "../solution/runtimes/bun/index.ts";
import * as solutionBunMarkdown from "../solution/runtimes/bun/markdown.ts";
import * as starterClient from "../starter/client/fetch.ts";
import * as starterCli from "../starter/core/cli.ts";
import * as starterCore from "../starter/core/index.ts";
import * as starterHttp from "../starter/core/http.ts";
import * as starterJson from "../starter/core/json.ts";
import * as starterRuntime from "../starter/core/runtime.ts";
import * as starterBun from "../starter/runtimes/bun/index.ts";
import * as starterBunMarkdown from "../starter/runtimes/bun/markdown.ts";
import {
  assert,
  assertRejects,
  cliContract,
  domainAndJsonContract,
  fetchClientContract,
  httpDispatchContract,
  markdownCloseContract,
  markdownCorruptionContract,
  openApiContract,
  repositoryContract,
  serverContract,
  starterIncompleteContract,
  type ContractImplementation,
  type RepositoryHarness,
} from "./contracts.ts";

const ROOT = "projects/tasks/.test-data/bun";
const selection = process.env.TASKS_IMPLEMENTATION ?? "solution";
if (selection !== "solution" && selection !== "starter") {
  throw new Error("TASKS_IMPLEMENTATION must be solution or starter");
}

const selectedCore = selection === "starter" ? starterCore : solutionCore;
const selectedJson = selection === "starter" ? starterJson : solutionJson;
const selectedClient = selection === "starter" ? starterClient : solutionClient;
const selectedCli = selection === "starter" ? starterCli : solutionCli;
const selectedRuntime = selection === "starter" ? starterRuntime : solutionRuntime;
const SelectedSqlite =
  selection === "starter"
    ? starterBun.BunSqliteRepository
    : solutionBun.BunSqliteRepository;
const SelectedMarkdown =
  selection === "starter"
    ? starterBun.BunMarkdownRepository
    : solutionBun.BunMarkdownRepository;

const implementation: ContractImplementation = {
  ...selectedCore,
  ...selectedJson,
  ...selectedClient,
  ...selectedCli,
  formatServerUrl: selectedRuntime.formatServerUrl,
  dispatchHttp:
    selection === "starter"
      ? (repository, request, logError) =>
          starterHttp.dispatchHttp(
            new starterCore.TaskService(repository),
            request,
            logError,
          )
      : (repository, request, logError) =>
          solutionHttp.dispatchHttp(
            new solutionCore.TaskService(repository),
            request,
            logError,
          ),
};

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

function markdownHarness(path: string): RepositoryHarness {
  return {
    name: `${selection} Bun Markdown`,
    path,
    create: (value) => new SelectedMarkdown(value),
    reset: () => reset(path),
    writeText: (source) => writeFile(path, source, "utf8"),
    writeBytes: (bytes) => writeFile(path, bytes),
  };
}

describe(`${selection} shared contracts`, () => {
  test("domain, service, and strict JSON", () => domainAndJsonContract(implementation));
  test("HTTP dispatch", () => httpDispatchContract(implementation));
  test("Fetch client", () => fetchClientContract(implementation));
  test("CLI", () => cliContract(implementation));
  test("canonical OpenAPI identity and parse", async () =>
    openApiContract(await readFile("projects/tasks/docs/openapi.yaml")));
});

for (const [name, extension, create] of [
  [`${selection} Bun SQLite`, "db", (path: string) => new SelectedSqlite(path)],
  [`${selection} Bun Markdown`, "md", (path: string) => new SelectedMarkdown(path)],
] as const) {
  const path = `${ROOT}/repository-${extension}.${extension}`;
  test(`${name} repository contract`, () =>
    repositoryContract(implementation, {
      name,
      path,
      create,
      reset: () => reset(path),
      writeText: (source) => writeFile(path, source, "utf8"),
      writeBytes: (bytes) => writeFile(path, bytes),
    }));
}

test(`${selection} Bun Markdown rejects corrupt persisted data`, () =>
  markdownCorruptionContract(implementation, markdownHarness(`${ROOT}/corrupt.md`)));
test(`${selection} Bun Markdown drains accepted writes on close`, () =>
  markdownCloseContract(implementation, markdownHarness(`${ROOT}/close.md`)));

test(`${selection} Bun Markdown publication is exclusive, mode 0600, and symlink-safe`, async () => {
  const publish =
    selection === "starter"
      ? starterBunMarkdown.publishBunMarkdownAtomically
      : solutionBunMarkdown.publishBunMarkdownAtomically;
  const target = `${ROOT}/publication.md`;
  const temporary = `${ROOT}/publication.tmp`;
  const victim = `${ROOT}/victim.txt`;
  await reset(target);
  await rm(temporary, { force: true });
  await writeFile(victim, "untouched", "utf8");
  await symlink("victim.txt", temporary);
  await assertRejects(
    () => publish(target, "must not follow\n", temporary),
    implementation.StorageError,
  );
  assert((await lstat(temporary)).isSymbolicLink());
  expect(await readFile(victim, "utf8")).toBe("untouched");
  await rm(temporary);
  await publish(target, "published\n", temporary);
  expect((await stat(target)).mode & 0o777).toBe(0o600);
  expect(await readFile(target, "utf8")).toBe("published\n");
});

test(`${selection} Bun SQLite rejects schema versions`, async () => {
  const path = `${ROOT}/schema.db`;
  await reset(path);
  const database = new Database(path, {
    create: true,
    strict: true,
    safeIntegers: true,
  });
  database.exec("PRAGMA user_version = 99");
  database.close();
  await assertRejects(
    async () => new SelectedSqlite(path),
    implementation.StorageError,
  );
});

test(`${selection} Bun SQLite rejects unsafe IDs`, async () => {
  const path = `${ROOT}/unsafe-id.db`;
  await reset(path);
  const repository = new SelectedSqlite(path);
  await repository.close();
  const database = new Database(path, {
    create: true,
    strict: true,
    safeIntegers: true,
  });
  database
    .query("INSERT INTO tasks(id, title, completed) VALUES (?, ?, 0)")
    .run(9_007_199_254_740_992n, "Unsafe");
  database.close();
  const reopened = new SelectedSqlite(path);
  try {
    await assertRejects(() => reopened.list({}), implementation.StorageError);
  } finally {
    await reopened.close();
  }
});

for (const [name, extension, create] of [
  [`${selection} Bun SQLite server`, "db", (path: string) => new SelectedSqlite(path)],
  [
    `${selection} Bun Markdown server`,
    "md",
    (path: string) => new SelectedMarkdown(path),
  ],
] as const) {
  const path = `${ROOT}/server-${extension}.${extension}`;
  test(`${name} loopback contract`, () =>
    serverContract(implementation, {
      name,
      path,
      createRepository: create,
      start:
        selection === "starter"
          ? (repository) =>
              Promise.resolve(
                starterBun.startBunServer({
                  service: new starterCore.TaskService(repository),
                  port: 0,
                }),
              )
          : (repository) =>
              Promise.resolve(
                solutionBun.startBunServer({
                  service: new solutionCore.TaskService(repository),
                  port: 0,
                }),
              ),
      reset: () => reset(path),
    }));
}

for (const [name, extension, create] of [
  [
    "starter Bun SQLite",
    "db",
    (path: string) => new starterBun.BunSqliteRepository(path),
  ],
  [
    "starter Bun Markdown",
    "md",
    (path: string) => new starterBun.BunMarkdownRepository(path),
  ],
] as const) {
  const path = `${ROOT}/${name.replaceAll(" ", "-")}.${extension}`;
  test(`${name} is visibly incomplete without storage effects`, async () => {
    await reset(path);
    await starterIncompleteContract(create, path, () => exists(path));
    expect(await exists(path)).toBe(false);
  });
}
