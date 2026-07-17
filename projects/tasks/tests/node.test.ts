import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import * as solutionClient from "../solution/client/fetch.ts";
import * as solutionCli from "../solution/core/cli.ts";
import * as solutionCore from "../solution/core/index.ts";
import * as solutionHttp from "../solution/core/http.ts";
import * as solutionJson from "../solution/core/json.ts";
import * as solutionRuntime from "../solution/core/runtime.ts";
import * as solutionNode from "../solution/runtimes/node/index.ts";
import * as solutionNodeSqlite from "../solution/runtimes/node/sqlite.ts";
import * as starterClient from "../starter/client/fetch.ts";
import * as starterCli from "../starter/core/cli.ts";
import * as starterCore from "../starter/core/index.ts";
import * as starterHttp from "../starter/core/http.ts";
import * as starterJson from "../starter/core/json.ts";
import * as starterRuntime from "../starter/core/runtime.ts";
import * as starterNode from "../starter/runtimes/node/index.ts";
import * as starterNodeSqlite from "../starter/runtimes/node/sqlite.ts";
import {
  assert,
  assertEquals,
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

const ROOT = "projects/tasks/.test-data/node";
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
    ? starterNode.NodeSqliteRepository
    : solutionNode.NodeSqliteRepository;
const SelectedMarkdown =
  selection === "starter"
    ? starterNode.NodeMarkdownRepository
    : solutionNode.NodeMarkdownRepository;

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
    name: `${selection} Node Markdown`,
    path,
    create: (value) => new SelectedMarkdown(value),
    reset: () => reset(path),
    writeText: (source) => writeFile(path, source, "utf8"),
    writeBytes: (bytes) => writeFile(path, bytes),
  };
}

test(`${selection}: shared domain, service, and strict JSON`, () =>
  domainAndJsonContract(implementation));
test(`${selection}: shared HTTP dispatch`, () => httpDispatchContract(implementation));
test(`${selection}: shared Fetch client`, () => fetchClientContract(implementation));
test(`${selection}: shared CLI`, () => cliContract(implementation));
test("canonical OpenAPI identity and parse", async () =>
  openApiContract(await readFile("projects/tasks/docs/openapi.yaml")));

test("starter and solution core exports stay aligned", () => {
  assertEquals(Object.keys(starterCore).sort(), Object.keys(solutionCore).sort());
});

test(`${selection} Node defensive mode is feature-detected`, () => {
  const enableDefensive =
    selection === "starter"
      ? starterNodeSqlite.enableNodeDefensiveMode
      : solutionNodeSqlite.enableNodeDefensiveMode;
  assertEquals(enableDefensive({}), false);
  let enabled = false;
  assertEquals(
    enableDefensive({
      enableDefensive(value) {
        enabled = value;
      },
    }),
    true,
  );
  assert(enabled);
});

for (const [name, extension, create] of [
  [`${selection} Node SQLite`, "db", (path: string) => new SelectedSqlite(path)],
  [`${selection} Node Markdown`, "md", (path: string) => new SelectedMarkdown(path)],
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

test(`${selection} Node Markdown rejects corrupt persisted data`, () =>
  markdownCorruptionContract(implementation, markdownHarness(`${ROOT}/corrupt.md`)));
test(`${selection} Node Markdown drains accepted writes on close`, () =>
  markdownCloseContract(implementation, markdownHarness(`${ROOT}/close.md`)));

test(`${selection} Node SQLite rejects unsupported schema versions`, async () => {
  const path = `${ROOT}/schema.db`;
  await reset(path);
  const database = new DatabaseSync(path);
  database.exec("PRAGMA user_version = 99");
  database.close();
  await assertRejects(
    async () => new SelectedSqlite(path),
    implementation.StorageError,
  );
});

test(`${selection} Node SQLite rejects unsafe IDs`, async () => {
  const path = `${ROOT}/unsafe-id.db`;
  await reset(path);
  const repository = new SelectedSqlite(path);
  await repository.close();
  const database = new DatabaseSync(path);
  database
    .prepare("INSERT INTO tasks(id, title, completed) VALUES (?, ?, 0)")
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
  [`${selection} Node SQLite server`, "db", (path: string) => new SelectedSqlite(path)],
  [
    `${selection} Node Markdown server`,
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
              starterNode.startNodeServer({
                service: new starterCore.TaskService(repository),
                port: 0,
              })
          : (repository) =>
              solutionNode.startNodeServer({
                service: new solutionCore.TaskService(repository),
                port: 0,
              }),
      reset: () => reset(path),
    }));
}

for (const [name, extension, create] of [
  [
    "starter Node SQLite",
    "db",
    (path: string) => new starterNode.NodeSqliteRepository(path),
  ],
  [
    "starter Node Markdown",
    "md",
    (path: string) => new starterNode.NodeMarkdownRepository(path),
  ],
] as const) {
  const path = `${ROOT}/${name.replaceAll(" ", "-")}.${extension}`;
  test(`${name} is visibly incomplete without storage effects`, async () => {
    await reset(path);
    await starterIncompleteContract(create, path, () => exists(path));
  });
}
