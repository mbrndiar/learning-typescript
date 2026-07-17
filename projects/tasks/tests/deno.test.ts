import { Database } from "jsr:@db/sqlite@0.13.0";
import * as solutionClient from "../solution/client/fetch.ts";
import * as solutionCli from "../solution/core/cli.ts";
import * as solutionCore from "../solution/core/index.ts";
import * as solutionHttp from "../solution/core/http.ts";
import * as solutionJson from "../solution/core/json.ts";
import * as solutionRuntime from "../solution/core/runtime.ts";
import * as solutionDeno from "../solution/runtimes/deno/index.ts";
import { DenoSqliteRepository as SolutionSqlite } from "../solution/runtimes/deno/sqlite.ts";
import * as starterClient from "../starter/client/fetch.ts";
import * as starterCli from "../starter/core/cli.ts";
import * as starterCore from "../starter/core/index.ts";
import * as starterHttp from "../starter/core/http.ts";
import * as starterJson from "../starter/core/json.ts";
import * as starterRuntime from "../starter/core/runtime.ts";
import * as starterDeno from "../starter/runtimes/deno/index.ts";
import { DenoSqliteRepository as StarterSqlite } from "../starter/runtimes/deno/sqlite.ts";
import {
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

const ROOT = "projects/tasks/.test-data/deno";
const selection = Deno.env.get("TASKS_IMPLEMENTATION") ?? "solution";
if (selection !== "solution" && selection !== "starter") {
  throw new Error("TASKS_IMPLEMENTATION must be solution or starter");
}

const selectedCore = selection === "starter" ? starterCore : solutionCore;
const selectedJson = selection === "starter" ? starterJson : solutionJson;
const selectedClient = selection === "starter" ? starterClient : solutionClient;
const selectedCli = selection === "starter" ? starterCli : solutionCli;
const selectedRuntime = selection === "starter" ? starterRuntime : solutionRuntime;
const SelectedSqlite = selection === "starter" ? StarterSqlite : SolutionSqlite;
const SelectedMarkdown =
  selection === "starter"
    ? starterDeno.DenoMarkdownRepository
    : solutionDeno.DenoMarkdownRepository;

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

function markdownHarness(path: string): RepositoryHarness {
  return {
    name: `${selection} Deno Markdown`,
    path,
    create: (value) => new SelectedMarkdown(value),
    reset: () => reset(path),
    writeText: (source) => Deno.writeTextFile(path, source),
    writeBytes: (bytes) => Deno.writeFile(path, bytes),
  };
}

Deno.test(`${selection}: shared domain, service, and strict JSON`, () =>
  domainAndJsonContract(implementation),
);
Deno.test(`${selection}: shared HTTP dispatch`, () =>
  httpDispatchContract(implementation),
);
Deno.test(`${selection}: shared Fetch client`, () =>
  fetchClientContract(implementation),
);
Deno.test(`${selection}: shared CLI`, () => cliContract(implementation));
Deno.test("canonical OpenAPI identity and parse", async () =>
  openApiContract(await Deno.readFile("projects/tasks/docs/openapi.yaml")),
);

for (const [name, extension, create] of [
  [`${selection} Deno SQLite`, "db", (path: string) => new SelectedSqlite(path)],
  [`${selection} Deno Markdown`, "md", (path: string) => new SelectedMarkdown(path)],
] as const) {
  const path = `${ROOT}/repository-${extension}.${extension}`;
  Deno.test(`${name} repository contract`, () =>
    repositoryContract(implementation, {
      name,
      path,
      create,
      reset: () => reset(path),
      writeText: (source) => Deno.writeTextFile(path, source),
      writeBytes: (bytes) => Deno.writeFile(path, bytes),
    }),
  );
}

Deno.test(`${selection} Deno Markdown rejects corrupt persisted data`, () =>
  markdownCorruptionContract(implementation, markdownHarness(`${ROOT}/corrupt.md`)),
);
Deno.test(`${selection} Deno Markdown drains accepted writes on close`, () =>
  markdownCloseContract(implementation, markdownHarness(`${ROOT}/close.md`)),
);

Deno.test(`${selection} Deno SQLite rejects schema versions`, async () => {
  const path = `${ROOT}/schema.db`;
  await reset(path);
  const database = new Database(path);
  database.exec("PRAGMA user_version = 99");
  database.close();
  await assertRejects(
    async () => new SelectedSqlite(path),
    implementation.StorageError,
  );
});

Deno.test(`${selection} Deno SQLite rejects unsafe IDs`, async () => {
  const path = `${ROOT}/unsafe-id.db`;
  await reset(path);
  const repository = new SelectedSqlite(path);
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
  const reopened = new SelectedSqlite(path);
  try {
    await assertRejects(() => reopened.list({}), implementation.StorageError);
  } finally {
    await reopened.close();
  }
});

for (const [name, extension, create] of [
  [`${selection} Deno SQLite server`, "db", (path: string) => new SelectedSqlite(path)],
  [
    `${selection} Deno Markdown server`,
    "md",
    (path: string) => new SelectedMarkdown(path),
  ],
] as const) {
  const path = `${ROOT}/server-${extension}.${extension}`;
  Deno.test(`${name} loopback contract`, () =>
    serverContract(implementation, {
      name,
      path,
      createRepository: create,
      start:
        selection === "starter"
          ? (repository) =>
              starterDeno.startDenoServer({
                service: new starterCore.TaskService(repository),
                port: 0,
              })
          : (repository) =>
              solutionDeno.startDenoServer({
                service: new solutionCore.TaskService(repository),
                port: 0,
              }),
      reset: () => reset(path),
    }),
  );
}

for (const [name, extension, create] of [
  ["starter Deno SQLite", "db", (path: string) => new StarterSqlite(path)],
  [
    "starter Deno Markdown",
    "md",
    (path: string) => new starterDeno.DenoMarkdownRepository(path),
  ],
] as const) {
  const path = `${ROOT}/${name.replaceAll(" ", "-")}.${extension}`;
  Deno.test(`${name} is visibly incomplete without storage effects`, async () => {
    await reset(path);
    await starterIncompleteContract(create, path, () => exists(path));
  });
}
