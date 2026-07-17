interface Task {
  readonly id: number;
  readonly title: string;
  readonly completed: boolean;
}

interface UpdateTaskDto {
  readonly title?: string;
  readonly completed?: boolean;
}

interface TaskFilter {
  readonly completed?: boolean;
}

interface TaskRepository {
  create(title: string): Promise<Task>;
  list(filter: TaskFilter): Promise<readonly Task[]>;
  get(id: number): Promise<Task>;
  update(id: number, update: UpdateTaskDto): Promise<Task>;
  delete(id: number): Promise<void>;
  close(): Promise<void>;
}

interface TaskClient {
  create(input: { readonly title: string }): Promise<Task>;
  list(filter: TaskFilter): Promise<readonly Task[]>;
  get(id: number): Promise<Task>;
  update(id: number, input: UpdateTaskDto): Promise<Task>;
  delete(id: number): Promise<void>;
}

interface HttpRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: Readonly<Record<string, string | undefined>>;
  readonly body: Uint8Array;
}

interface HttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: Uint8Array;
}

interface RunningServer {
  readonly url: string;
  readonly finished: Promise<void>;
  close(): Promise<void>;
}

export type FetchFunction = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type ErrorConstructor = abstract new (...args: never[]) => Error;

interface TaskServiceContract {
  create(input: unknown): Promise<Task>;
  list(completed?: unknown): Promise<readonly Task[]>;
  get(id: unknown): Promise<Task>;
  update(id: unknown, input: unknown): Promise<Task>;
  delete(id: unknown): Promise<void>;
}

export interface ContractImplementation {
  readonly ApiError: ErrorConstructor;
  readonly ClientProtocolError: ErrorConstructor;
  readonly ClientTransportError: new (message: string, cause?: unknown) => Error;
  readonly LifecycleError: ErrorConstructor;
  readonly ValidationError: ErrorConstructor;
  readonly TaskNotFoundError: new (id: number) => Error;
  readonly StorageError: new (
    operation: string,
    message: string,
    cause?: unknown,
  ) => Error;
  readonly TaskService: new (repository: TaskRepository) => TaskServiceContract;
  readonly FetchTaskClient: new (options: {
    readonly baseUrl: string | URL;
    readonly timeoutMs?: number;
    readonly fetch?: FetchFunction;
    readonly maximumResponseBytes?: number;
  }) => TaskClient;
  readonly CLI_EXIT: {
    readonly success: number;
    readonly usage: number;
    readonly api: number;
    readonly protocol: number;
    readonly transport: number;
  };
  readonly MAX_REQUEST_BYTES: number;
  readonly MAX_JSON_NESTING: number;
  readonly parseCreateTaskDto: (value: unknown) => { readonly title: string };
  readonly parseUpdateTaskDto: (value: unknown) => UpdateTaskDto;
  readonly parseTask: (value: unknown) => Task;
  readonly parseStrictJsonBytes: (bytes: Uint8Array, maximumBytes: number) => unknown;
  readonly dispatchHttp: (
    repository: TaskRepository,
    request: HttpRequest,
    logError?: (error: unknown) => void,
  ) => Promise<HttpResponse>;
  readonly runCli: (
    args: readonly string[],
    createClient: (configuration: {
      readonly baseUrl: string;
      readonly timeoutMs: number;
    }) => TaskClient,
    io: {
      readonly stdout: (line: string) => void;
      readonly stderr: (line: string) => void;
    },
  ) => Promise<number>;
  readonly formatServerUrl: (hostname: string, port: number) => string;
}

export type RepositoryFactory = (
  path: string,
) => TaskRepository | Promise<TaskRepository>;

export interface RepositoryHarness {
  readonly name: string;
  readonly path: string;
  readonly create: RepositoryFactory;
  readonly reset: () => Promise<void>;
  readonly writeText: (source: string) => Promise<void>;
  readonly writeBytes: (bytes: Uint8Array) => Promise<void>;
}

export interface ServerHarness {
  readonly name: string;
  readonly path: string;
  readonly createRepository: RepositoryFactory;
  readonly start: (
    repository: TaskRepository,
  ) => RunningServer | Promise<RunningServer>;
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
      `expected ${errorType.name}, received ${error instanceof Error ? error.name : String(error)}`,
    );
  }
  return fail(`expected ${errorType.name} to be thrown`);
}

class MemoryRepository implements TaskRepository {
  readonly #tasks = new Map<number, Task>();
  readonly #notFound: new (id: number) => Error;
  #nextId = 1;

  constructor(notFound: new (id: number) => Error) {
    this.#notFound = notFound;
  }

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
    if (task === undefined) {
      const NotFound = this.#notFound;
      throw new NotFound(id);
    }
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
    if (!this.#tasks.delete(id)) {
      const NotFound = this.#notFound;
      throw new NotFound(id);
    }
  }

  async close(): Promise<void> {}
}

export async function domainAndJsonContract(
  implementation: ContractImplementation,
): Promise<void> {
  assertEquals(implementation.parseCreateTaskDto({ title: "  Learn REST  " }), {
    title: "Learn REST",
  });
  assertEquals(implementation.parseUpdateTaskDto({ completed: true }), {
    completed: true,
  });
  await assertRejects(
    async () => implementation.parseCreateTaskDto({ title: "ok", done: false }),
    implementation.ValidationError,
  );
  await assertRejects(
    async () => implementation.parseUpdateTaskDto({}),
    implementation.ValidationError,
  );
  await assertRejects(
    async () => implementation.parseCreateTaskDto({ title: "line\nbreak" }),
    implementation.ValidationError,
  );
  await assertRejects(
    async () => implementation.parseCreateTaskDto({ title: "\ud800" }),
    implementation.ValidationError,
  );
  assertEquals(
    implementation.parseStrictJsonBytes(
      new TextEncoder().encode('{"outer":{"value":1},"items":[true,null]}'),
      implementation.MAX_REQUEST_BYTES,
    ),
    { outer: { value: 1 }, items: [true, null] },
  );
  await assertRejects(
    async () =>
      implementation.parseStrictJsonBytes(
        new TextEncoder().encode('{"outer":{"value":1,"value":2}}'),
        implementation.MAX_REQUEST_BYTES,
      ),
    SyntaxError,
  );
  await assertRejects(
    async () =>
      implementation.parseStrictJsonBytes(
        new Uint8Array(implementation.MAX_REQUEST_BYTES + 1),
        implementation.MAX_REQUEST_BYTES,
      ),
    implementation.ValidationError,
  );
  const atLimit = "[".repeat(implementation.MAX_JSON_NESTING) +
    "0" +
    "]".repeat(implementation.MAX_JSON_NESTING);
  implementation.parseStrictJsonBytes(
    new TextEncoder().encode(atLimit),
    implementation.MAX_REQUEST_BYTES,
  );
  const overLimit = `[${atLimit}]`;
  await assertRejects(
    async () =>
      implementation.parseStrictJsonBytes(
        new TextEncoder().encode(overLimit),
        implementation.MAX_REQUEST_BYTES,
      ),
    SyntaxError,
  );
  const extreme = `${"[".repeat(10_000)}0${"]".repeat(10_000)}`;
  await assertRejects(
    async () =>
      implementation.parseStrictJsonBytes(
        new TextEncoder().encode(extreme),
        implementation.MAX_REQUEST_BYTES,
      ),
    SyntaxError,
  );
  assertEquals(implementation.parseTask({ id: 1, title: "Task", completed: false }), {
    id: 1,
    title: "Task",
    completed: false,
  });
  await assertRejects(
    async () => implementation.parseTask({ id: 1, title: " Task ", completed: false }),
    implementation.ClientProtocolError,
  );
  await assertRejects(
    async () => implementation.parseTask({ id: "1", title: "Task", completed: false }),
    implementation.ClientProtocolError,
  );
  assertEquals(
    implementation.formatServerUrl("127.0.0.1", 8000),
    "http://127.0.0.1:8000",
  );
  assertEquals(implementation.formatServerUrl("::1", 8000), "http://[::1]:8000");

  const service = new implementation.TaskService(
    new MemoryRepository(implementation.TaskNotFoundError),
  );
  const task = await service.create({ title: " First " });
  assertEquals(task, { id: 1, title: "First", completed: false });
  assertEquals(await service.update(1, { completed: true }), {
    id: 1,
    title: "First",
    completed: true,
  });
  assertEquals(await service.list(true), [await service.get(1)]);
}

export async function repositoryContract(
  implementation: ContractImplementation,
  harness: RepositoryHarness,
): Promise<void> {
  await harness.reset();
  let repository = await harness.create(harness.path);
  try {
    assertEquals(await repository.list({}), []);
    await assertRejects(() => repository.create("   "), implementation.ValidationError);
    await assertRejects(
      () => repository.create("\ud800"),
      implementation.ValidationError,
    );
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
    await assertRejects(() => repository.get(1), implementation.TaskNotFoundError);
  } finally {
    await repository.close();
    await repository.close();
  }
  await assertRejects(() => repository.list({}), implementation.LifecycleError);

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
  implementation: ContractImplementation,
  harness: RepositoryHarness,
): Promise<void> {
  await harness.reset();
  await harness.writeText(
    "<!-- rest-task-api:v1 next-id=1 -->\n# Tasks\n\n- [ ] 1: Broken\n",
  );
  const repository = await harness.create(harness.path);
  try {
    await assertRejects(() => repository.list({}), implementation.StorageError);
  } finally {
    await repository.close();
  }
  await harness.reset();
  await harness.writeBytes(new Uint8Array([0xff, 0xfe, 0xfd]));
  const invalidUtf8 = await harness.create(harness.path);
  try {
    await assertRejects(() => invalidUtf8.list({}), implementation.StorageError);
  } finally {
    await invalidUtf8.close();
  }
}

export async function markdownCloseContract(
  implementation: ContractImplementation,
  harness: RepositoryHarness,
): Promise<void> {
  await harness.reset();
  const repository = await harness.create(harness.path);
  const accepted = repository.create("Accepted before close");
  const closing = repository.close();
  await assertRejects(
    () => repository.create("Rejected after close"),
    implementation.LifecycleError,
  );
  assertEquals(await accepted, {
    id: 1,
    title: "Accepted before close",
    completed: false,
  });
  await closing;
  const reopened = await harness.create(harness.path);
  try {
    assertEquals(await reopened.get(1), {
      id: 1,
      title: "Accepted before close",
      completed: false,
    });
  } finally {
    await reopened.close();
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

export async function httpDispatchContract(
  implementation: ContractImplementation,
): Promise<void> {
  const repository = new MemoryRepository(implementation.TaskNotFoundError);
  assertEquals(
    decodeBody(
      await implementation.dispatchHttp(repository, request("GET", "/health")),
    ),
    { status: "ok" },
  );
  const created = await implementation.dispatchHttp(
    repository,
    request("POST", "/tasks", '{"title":" Test "}', "application/json"),
  );
  assertEquals(created.status, 201);
  assertEquals(decodeBody(created), {
    id: 1,
    title: "Test",
    completed: false,
  });
  const duplicate = await implementation.dispatchHttp(
    repository,
    request(
      "PATCH",
      "/tasks/1",
      '{"completed":true,"nested":{"x":1,"x":2}}',
      "application/json",
    ),
  );
  assertEquals(duplicate.status, 400);
  const unknown = await implementation.dispatchHttp(
    repository,
    request("POST", "/tasks", '{"title":"x","done":true}', "application/json"),
  );
  assertEquals(unknown.status, 422);
  const method = await implementation.dispatchHttp(
    repository,
    request("PUT", "/tasks/1"),
  );
  assertEquals(method.status, 405);
  assertEquals(method.headers.allow, "GET, PATCH, DELETE");
  for (
    const url of [
      "/tasks?completed=yes",
      "/tasks/not-a-number",
      "/tasks/9007199254740992",
    ]
  ) {
    assertEquals(
      (await implementation.dispatchHttp(repository, request("GET", url))).status,
      422,
    );
  }
  const nested = "[".repeat(implementation.MAX_JSON_NESTING + 1) +
    "0" +
    "]".repeat(implementation.MAX_JSON_NESTING + 1);
  assertEquals(
    (
      await implementation.dispatchHttp(
        repository,
        request("POST", "/tasks", nested, "application/json"),
      )
    ).status,
    400,
  );
  assertEquals(
    (
      await implementation.dispatchHttp(
        repository,
        request("POST", "/tasks", '{"title":"\\ud800"}', "application/json"),
      )
    ).status,
    422,
  );
  const storageFailure: TaskRepository = {
    async create() {
      throw new implementation.StorageError("create task", "private diagnostic");
    },
    async list() {
      throw new implementation.StorageError("list tasks", "private diagnostic");
    },
    async get() {
      throw new implementation.StorageError("get task", "private diagnostic");
    },
    async update() {
      throw new implementation.StorageError("update task", "private diagnostic");
    },
    async delete() {
      throw new implementation.StorageError("delete task", "private diagnostic");
    },
    async close() {},
  };
  const logged: unknown[] = [];
  const internal = await implementation.dispatchHttp(
    storageFailure,
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

export async function serverContract(
  implementation: ContractImplementation,
  harness: ServerHarness,
): Promise<void> {
  await harness.reset();
  const repository = await harness.createRepository(harness.path);
  const server = await harness.start(repository);
  try {
    const client = new implementation.FetchTaskClient({
      baseUrl: server.url,
      timeoutMs: 2_000,
    });
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
    for (
      const [path, allow] of [
        ["/health", "GET"],
        ["/tasks", "GET, POST"],
        ["/tasks/1", "GET, PATCH, DELETE"],
      ] as const
    ) {
      const method = await fetch(`${server.url}${path}`, {
        method: "PUT",
        redirect: "manual",
      });
      assertEquals(method.status, 405);
      assertEquals(method.headers.get("allow"), allow);
    }
    const trimmed = await fetch(`${server.url}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"title":"  Server trim  "}',
      redirect: "manual",
    });
    assertEquals(trimmed.status, 201);
    assertEquals(await trimmed.json(), {
      id: 2,
      title: "Server trim",
      completed: false,
    });
    for (const body of ['{"title":"bad\\u0001title"}', '{"title":"\\ud800"}']) {
      const invalidTitle = await fetch(`${server.url}/tasks`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        redirect: "manual",
      });
      assertEquals(invalidTitle.status, 422);
    }
    assertEquals(
      (
        await fetch(`${server.url}/tasks/9007199254740992`, {
          redirect: "manual",
        })
      ).status,
      422,
    );
  } finally {
    await server.close();
    await server.close();
    await server.finished;
    await repository.close();
  }
}

export async function fetchClientContract(
  implementation: ContractImplementation,
): Promise<void> {
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
  const client = new implementation.FetchTaskClient({
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
  await assertRejects(() => client.get(9), implementation.ApiError);
  assertEquals(calls.length, 3);
  assert(calls.every((call) => call.redirect === "manual"));

  const malformed = new implementation.FetchTaskClient({
    baseUrl: "http://127.0.0.1:8000",
    fetch: async () =>
      new Response('{"id":1,"title":"x","completed":false,"extra":1}', {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  });
  await assertRejects(() => malformed.get(1), implementation.ClientProtocolError);
  const numericString = new implementation.FetchTaskClient({
    baseUrl: "http://127.0.0.1:8000",
    fetch: async () => Response.json({ id: "1", title: "Task", completed: false }, { status: 200 }),
  });
  await assertRejects(() => numericString.get(1), implementation.ClientProtocolError);
  const mismatchedError = new implementation.FetchTaskClient({
    baseUrl: "http://127.0.0.1:8000",
    fetch: async () =>
      Response.json(
        { error: { code: "validation_error", message: "wrong code" } },
        { status: 404 },
      ),
  });
  await assertRejects(() => mismatchedError.get(1), implementation.ClientProtocolError);

  const timeout = new implementation.FetchTaskClient({
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
  await assertRejects(() => timeout.get(1), implementation.ClientTransportError);

  const failedStream = new implementation.FetchTaskClient({
    baseUrl: "http://127.0.0.1:8000",
    fetch: async () =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.error(new Error("stream reset"));
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
  });
  await assertRejects(() => failedStream.get(1), implementation.ClientTransportError);

  const bodyTimeout = new implementation.FetchTaskClient({
    baseUrl: "http://127.0.0.1:8000",
    timeoutMs: 5,
    fetch: async (_input, init) =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            init?.signal?.addEventListener(
              "abort",
              () => controller.error(new DOMException("aborted", "AbortError")),
              { once: true },
            );
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
  });
  await assertRejects(() => bodyTimeout.get(1), implementation.ClientTransportError);

  const oversized = new implementation.FetchTaskClient({
    baseUrl: "http://127.0.0.1:8000",
    maximumResponseBytes: 2,
    fetch: async () =>
      new Response("{} ", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  });
  await assertRejects(() => oversized.get(1), implementation.ClientProtocolError);
}

export async function cliContract(
  implementation: ContractImplementation,
): Promise<void> {
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
    await implementation.runCli(
      ["--base-url", "http://localhost:9", "add", "CLI"],
      () => client,
      io,
    ),
    implementation.CLI_EXIT.success,
  );
  assertEquals(JSON.parse(output[0] ?? ""), {
    id: 1,
    title: "CLI",
    completed: false,
  });
  assertEquals(
    await implementation.runCli(
      ["update", "1", "--completed", "true"],
      () => client,
      io,
    ),
    implementation.CLI_EXIT.success,
  );
  assertEquals(
    await implementation.runCli(["remove", "1"], () => client, io),
    implementation.CLI_EXIT.success,
  );
  assertEquals(JSON.parse(output[2] ?? ""), { deleted: 1 });
  assertEquals(
    await implementation.runCli(["show", "0"], () => client, io),
    implementation.CLI_EXIT.usage,
  );
  assert(errors.at(-1)?.startsWith("usage:"));
  const transportClient: TaskClient = {
    ...client,
    async get() {
      throw new implementation.ClientTransportError("stream failed");
    },
  };
  assertEquals(
    await implementation.runCli(["show", "1"], () => transportClient, io),
    implementation.CLI_EXIT.transport,
  );
  assert(errors.at(-1)?.startsWith("transport:"));
}

export async function openApiContract(bytes: Uint8Array): Promise<void> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer),
  );
  const hash = [...digest].map((value) => value.toString(16).padStart(2, "0")).join("");
  assertEquals(
    hash,
    "09e3e6c08fc92dd10bd3c621dbc30e720f05b8684a314fa940b2daed0f7bd44c",
  );
  const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const openapi = /^openapi:\s*(\S+)$/mu.exec(source)?.[1];
  const title = /^\s{2}title:\s*(.+)$/mu.exec(source)?.[1];
  const version = /^\s{2}version:\s*(\S+)$/mu.exec(source)?.[1];
  const paths = [...source.matchAll(/^\s{2}(\/[^:]+):$/gmu)].map((match) => match[1]);
  assertEquals(
    { openapi, title, version, paths },
    {
      openapi: "3.1.0",
      title: "Task REST API",
      version: "1.0.0",
      paths: ["/health", "/tasks", "/tasks/{taskId}"],
    },
  );
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
