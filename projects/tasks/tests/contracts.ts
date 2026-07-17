import { FetchTaskClient, type FetchFunction } from "../solution/client/fetch.ts";
import { CLI_EXIT, runCli } from "../solution/core/cli.ts";
import {
  ApiError,
  ClientProtocolError,
  ClientTransportError,
  LifecycleError,
  StorageError,
  TaskNotFoundError,
  TaskService,
  ValidationError,
  parseCreateTaskDto,
  parseTask,
  parseUpdateTaskDto,
  type Task,
  type TaskClient,
  type TaskFilter,
  type TaskRepository,
  type UpdateTaskDto,
} from "../solution/core/index.ts";
import { dispatchHttp, type HttpRequest } from "../solution/core/http.ts";
import { MAX_REQUEST_BYTES, parseStrictJsonBytes } from "../solution/core/json.ts";
import type { RunningServer } from "../solution/core/runtime.ts";

export type RepositoryFactory = (
  path: string,
) => TaskRepository | Promise<TaskRepository>;

export interface RepositoryHarness {
  readonly name: string;
  readonly path: string;
  readonly create: RepositoryFactory;
  readonly reset: () => Promise<void>;
  readonly writeText: (source: string) => Promise<void>;
}

export interface ServerHarness {
  readonly name: string;
  readonly path: string;
  readonly createRepository: RepositoryFactory;
  readonly start: (service: TaskService) => RunningServer | Promise<RunningServer>;
  readonly reset: () => Promise<void>;
}

function fail(message: string): never {
  throw new Error(message);
}

export function assert(
  condition: unknown,
  message = "assertion failed",
): asserts condition {
  if (!condition) fail(message);
}

export function assertEquals(actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    fail(`expected ${expectedJson}, received ${actualJson}`);
  }
}

export async function assertRejects(
  operation: () => Promise<unknown>,
  errorType: abstract new (...args: never[]) => Error,
): Promise<Error> {
  try {
    await operation();
  } catch (error) {
    if (error instanceof errorType) return error;
    fail(
      `expected ${errorType.name}, received ${
        error instanceof Error ? error.name : String(error)
      }`,
    );
  }
  return fail(`expected ${errorType.name} to be thrown`);
}

class MemoryRepository implements TaskRepository {
  readonly #tasks = new Map<number, Task>();
  #nextId = 1;

  async create(title: string): Promise<Task> {
    const task = Object.freeze({
      id: this.#nextId,
      title,
      completed: false,
    });
    this.#nextId += 1;
    this.#tasks.set(task.id, task);
    return task;
  }

  async list(filter: TaskFilter): Promise<readonly Task[]> {
    return [...this.#tasks.values()].filter(
      (task) => filter.completed === undefined || task.completed === filter.completed,
    );
  }

  async get(id: number): Promise<Task> {
    const task = this.#tasks.get(id);
    if (task === undefined) throw new TaskNotFoundError(id);
    return task;
  }

  async update(id: number, update: UpdateTaskDto): Promise<Task> {
    const current = await this.get(id);
    const task = Object.freeze({
      id,
      title: update.title ?? current.title,
      completed: update.completed ?? current.completed,
    });
    this.#tasks.set(id, task);
    return task;
  }

  async delete(id: number): Promise<void> {
    if (!this.#tasks.delete(id)) throw new TaskNotFoundError(id);
  }

  async close(): Promise<void> {}
}

export async function domainAndJsonContract(): Promise<void> {
  assertEquals(parseCreateTaskDto({ title: "  Learn REST  " }), {
    title: "Learn REST",
  });
  assertEquals(parseUpdateTaskDto({ completed: true }), { completed: true });
  await assertRejects(
    async () => parseCreateTaskDto({ title: "ok", done: false }),
    ValidationError,
  );
  await assertRejects(async () => parseUpdateTaskDto({}), ValidationError);
  await assertRejects(
    async () => parseCreateTaskDto({ title: "line\nbreak" }),
    ValidationError,
  );
  assertEquals(
    parseStrictJsonBytes(
      new TextEncoder().encode('{"outer":{"value":1},"items":[true,null]}'),
      MAX_REQUEST_BYTES,
    ),
    { outer: { value: 1 }, items: [true, null] },
  );
  await assertRejects(
    async () =>
      parseStrictJsonBytes(
        new TextEncoder().encode('{"outer":{"value":1,"value":2}}'),
        MAX_REQUEST_BYTES,
      ),
    SyntaxError,
  );
  await assertRejects(
    async () =>
      parseStrictJsonBytes(new Uint8Array(MAX_REQUEST_BYTES + 1), MAX_REQUEST_BYTES),
    ValidationError,
  );
  assertEquals(parseTask({ id: 1, title: "Task", completed: false }), {
    id: 1,
    title: "Task",
    completed: false,
  });
  await assertRejects(
    async () => parseTask({ id: 1, title: " Task ", completed: false }),
    ClientProtocolError,
  );

  const service = new TaskService(new MemoryRepository());
  const task = await service.create({ title: " First " });
  assertEquals(task, { id: 1, title: "First", completed: false });
  assertEquals(await service.update(1, { completed: true }), {
    id: 1,
    title: "First",
    completed: true,
  });
  assertEquals(await service.list(true), [await service.get(1)]);
}

export async function repositoryContract(harness: RepositoryHarness): Promise<void> {
  await harness.reset();
  let repository = await harness.create(harness.path);
  try {
    assertEquals(await repository.list({}), []);
    await assertRejects(() => repository.create("   "), ValidationError);
    const first = await repository.create("First");
    const second = await repository.create("Second");
    assertEquals(first, { id: 1, title: "First", completed: false });
    assertEquals(second, { id: 2, title: "Second", completed: false });
    assertEquals(await repository.update(2, { completed: true }), {
      id: 2,
      title: "Second",
      completed: true,
    });
    assertEquals(await repository.list({ completed: true }), [
      { id: 2, title: "Second", completed: true },
    ]);
    await repository.delete(1);
    await assertRejects(() => repository.get(1), TaskNotFoundError);
  } finally {
    await repository.close();
    await repository.close();
  }
  await assertRejects(() => repository.list({}), LifecycleError);

  repository = await harness.create(harness.path);
  try {
    assertEquals(await repository.get(2), {
      id: 2,
      title: "Second",
      completed: true,
    });
    assertEquals(await repository.create("Third"), {
      id: 3,
      title: "Third",
      completed: false,
    });
  } finally {
    await repository.close();
  }
}

export async function markdownCorruptionContract(
  harness: RepositoryHarness,
): Promise<void> {
  await harness.reset();
  await harness.writeText(
    "<!-- rest-task-api:v1 next-id=1 -->\n# Tasks\n\n- [ ] 1: Broken\n",
  );
  const repository = await harness.create(harness.path);
  try {
    await assertRejects(() => repository.list({}), StorageError);
  } finally {
    await repository.close();
  }
}

function request(
  method: string,
  url: string,
  body = "",
  contentType?: string,
): HttpRequest {
  return {
    method,
    url,
    headers: contentType === undefined ? {} : { "content-type": contentType },
    body: new TextEncoder().encode(body),
  };
}

function decodeBody(response: { readonly body: Uint8Array }): unknown {
  return JSON.parse(new TextDecoder().decode(response.body)) as unknown;
}

export async function httpDispatchContract(): Promise<void> {
  const service = new TaskService(new MemoryRepository());
  assertEquals(decodeBody(await dispatchHttp(service, request("GET", "/health"))), {
    status: "ok",
  });
  const created = await dispatchHttp(
    service,
    request("POST", "/tasks", '{"title":" Test "}', "application/json"),
  );
  assertEquals(created.status, 201);
  assertEquals(decodeBody(created), {
    id: 1,
    title: "Test",
    completed: false,
  });
  const duplicate = await dispatchHttp(
    service,
    request(
      "PATCH",
      "/tasks/1",
      '{"completed":true,"nested":{"x":1,"x":2}}',
      "application/json",
    ),
  );
  assertEquals(duplicate.status, 400);
  const unknown = await dispatchHttp(
    service,
    request("POST", "/tasks", '{"title":"x","done":true}', "application/json"),
  );
  assertEquals(unknown.status, 422);
  const method = await dispatchHttp(service, request("PUT", "/tasks/1"));
  assertEquals(method.status, 405);
  assertEquals(method.headers.allow, "GET, PATCH, DELETE");
  assertEquals(
    (await dispatchHttp(service, request("GET", "/tasks?completed=yes"))).status,
    422,
  );
  assertEquals(
    (await dispatchHttp(service, request("GET", "/tasks/not-a-number"))).status,
    422,
  );
  const storageFailure: TaskRepository = {
    async create() {
      throw new StorageError("create task", "private diagnostic");
    },
    async list() {
      throw new StorageError("list tasks", "private diagnostic");
    },
    async get() {
      throw new StorageError("get task", "private diagnostic");
    },
    async update() {
      throw new StorageError("update task", "private diagnostic");
    },
    async delete() {
      throw new StorageError("delete task", "private diagnostic");
    },
    async close() {},
  };
  const logged: unknown[] = [];
  const internal = await dispatchHttp(
    new TaskService(storageFailure),
    request("GET", "/tasks"),
    (error) => logged.push(error),
  );
  assertEquals(internal.status, 500);
  assertEquals(decodeBody(internal), {
    error: {
      code: "internal_error",
      message: "the server could not complete the request",
    },
  });
  assertEquals(logged.length, 1);
}

export async function serverContract(harness: ServerHarness): Promise<void> {
  await harness.reset();
  const repository = await harness.createRepository(harness.path);
  const server = await harness.start(new TaskService(repository));
  try {
    const client = new FetchTaskClient({ baseUrl: server.url, timeoutMs: 2_000 });
    assertEquals(await client.create({ title: "Loopback" }), {
      id: 1,
      title: "Loopback",
      completed: false,
    });
    assertEquals(await client.update(1, { completed: true }), {
      id: 1,
      title: "Loopback",
      completed: true,
    });
    assertEquals(await client.list({ completed: true }), [
      { id: 1, title: "Loopback", completed: true },
    ]);
    const duplicate = await fetch(`${server.url}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"title":"one","title":"two"}',
      redirect: "manual",
    });
    assertEquals(duplicate.status, 400);
    const method = await fetch(`${server.url}/health`, {
      method: "POST",
      redirect: "manual",
    });
    assertEquals(method.status, 405);
    assertEquals(method.headers.get("allow"), "GET");
  } finally {
    await server.close();
    await server.close();
    await server.finished;
    await repository.close();
  }
}

export async function fetchClientContract(): Promise<void> {
  const calls: Request[] = [];
  const fakeFetch: FetchFunction = async (input, init) => {
    const request = new Request(input, init);
    calls.push(request);
    if (request.url.endsWith("/tasks") && request.method === "POST") {
      return Response.json(
        { id: 1, title: "Created", completed: false },
        { status: 201 },
      );
    }
    if (request.url.includes("completed=true")) {
      return Response.json([{ id: 1, title: "Created", completed: true }], {
        status: 200,
      });
    }
    return Response.json(
      { error: { code: "not_found", message: "task 9 was not found" } },
      { status: 404 },
    );
  };
  const client = new FetchTaskClient({
    baseUrl: "http://127.0.0.1:8000",
    timeoutMs: 100,
    fetch: fakeFetch,
  });
  assertEquals(await client.create({ title: "Created" }), {
    id: 1,
    title: "Created",
    completed: false,
  });
  assertEquals(await client.list({ completed: true }), [
    { id: 1, title: "Created", completed: true },
  ]);
  await assertRejects(() => client.get(9), ApiError);
  assertEquals(calls.length, 3);
  assert(calls.every((call) => call.redirect === "manual"));

  const malformed = new FetchTaskClient({
    baseUrl: "http://127.0.0.1:8000",
    fetch: async () =>
      new Response('{"id":1,"title":"x","completed":false,"extra":1}', {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  });
  await assertRejects(() => malformed.get(1), ClientProtocolError);
  const mismatchedError = new FetchTaskClient({
    baseUrl: "http://127.0.0.1:8000",
    fetch: async () =>
      Response.json(
        { error: { code: "validation_error", message: "wrong code" } },
        { status: 404 },
      ),
  });
  await assertRejects(() => mismatchedError.get(1), ClientProtocolError);

  const timeout = new FetchTaskClient({
    baseUrl: "http://127.0.0.1:8000",
    timeoutMs: 5,
    fetch: async (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("aborted", "AbortError")),
          { once: true },
        );
      }),
  });
  await assertRejects(() => timeout.get(1), ClientTransportError);
}

export async function cliContract(): Promise<void> {
  const output: string[] = [];
  const errors: string[] = [];
  const client: TaskClient = {
    async create(input) {
      return { id: 1, title: input.title, completed: false };
    },
    async list() {
      return [{ id: 1, title: "CLI", completed: false }];
    },
    async get(id) {
      return { id, title: "CLI", completed: false };
    },
    async update(id, input) {
      return {
        id,
        title: input.title ?? "CLI",
        completed: input.completed ?? false,
      };
    },
    async delete() {},
  };
  const io = {
    stdout: (line: string) => output.push(line),
    stderr: (line: string) => errors.push(line),
  };
  assertEquals(
    await runCli(["--base-url", "http://localhost:9", "add", "CLI"], () => client, io),
    CLI_EXIT.success,
  );
  assertEquals(JSON.parse(output[0] ?? ""), {
    id: 1,
    title: "CLI",
    completed: false,
  });
  assertEquals(
    await runCli(["update", "1", "--completed", "true"], () => client, io),
    CLI_EXIT.success,
  );
  assertEquals(await runCli(["remove", "1"], () => client, io), CLI_EXIT.success);
  assertEquals(JSON.parse(output[2] ?? ""), { deleted: 1 });
  assertEquals(await runCli(["show", "0"], () => client, io), CLI_EXIT.usage);
  assert(errors.at(-1)?.startsWith("usage:"));
}

export async function starterIncompleteContract(
  create: (path: string) => TaskRepository,
  path: string,
  exists: () => Promise<boolean>,
): Promise<void> {
  const repository = create(path);
  assert(!(await exists()), "starter constructor created storage");
  try {
    await repository.create("must not persist");
    fail("starter repository unexpectedly completed an operation");
  } catch (error) {
    assert(error instanceof Error);
    assertEquals(error.name, "IncompleteProjectError");
    assert(error.message.startsWith("starter incomplete:"));
  }
  assert(!(await exists()), "starter operation created storage");
  await repository.close();
}
