import assert from "node:assert/strict";
import { mkdir, rm } from "node:fs/promises";
import test from "node:test";
import {
  ApiError,
  ClientProtocolError,
  ClientTransportError,
  StorageError,
  TaskNotFoundError,
  TaskService,
  ValidationError,
  type Task,
  type TaskClient,
  type TaskFilter,
  type TaskRepository,
  type UpdateTaskDto,
} from "../solution/core/index.ts";
import { runCli } from "../solution/core/cli.ts";
import { dispatchHttp } from "../solution/core/http.ts";
import { parseStrictJsonBytes, readBoundedStream } from "../solution/core/json.ts";
import { parseApiArguments } from "../solution/core/runtime.ts";
import {
  SerialExecutor,
  parseMarkdownDocument,
  serializeMarkdownDocument,
} from "../solution/storage/markdown.ts";
import { FetchTaskClient } from "../solution/client/fetch.ts";
import { NodeMarkdownRepository } from "../solution/runtimes/node/markdown.ts";
import { NodeSqliteRepository } from "../solution/runtimes/node/sqlite.ts";
import { startNodeServer } from "../solution/runtimes/node/server.ts";

const ROOT = "projects/tasks/.test-data/node-coverage";
const solutionTests = (process.env.TASKS_IMPLEMENTATION ?? "starter") === "solution";

class MemoryRepository implements TaskRepository {
  readonly #tasks = new Map<number, Task>();
  #nextId = 1;

  async create(title: string): Promise<Task> {
    const task = Object.freeze({ id: this.#nextId, title, completed: false });
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

function bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function request(method: string, url: string, body = "", contentType?: string) {
  return {
    method,
    url,
    headers: contentType === undefined ? {} : { "content-type": contentType },
    body: bytes(body),
  };
}

async function reset(path: string): Promise<void> {
  await mkdir(ROOT, { recursive: true });
  await rm(path, { force: true, recursive: true });
}

if (solutionTests) {
  test("Task API arguments validate backends, paths, hosts, and ports", () => {
    assert.deepEqual(parseApiArguments([], "node"), {
      backend: "sqlite",
      dataPath: "tasks-node.db",
      hostname: "127.0.0.1",
      port: 8000,
    });
    assert.deepEqual(
      parseApiArguments(
        [
          "--backend",
          "markdown",
          "--data",
          "state/tasks.md",
          "--host",
          "::1",
          "--port",
          "0",
        ],
        "deno",
      ),
      {
        backend: "markdown",
        dataPath: "state/tasks.md",
        hostname: "::1",
        port: 0,
      },
    );
    assert.equal(parseApiArguments(["--port", "65535"], "bun").port, 65_535);

    for (const args of [
      ["--backend"],
      ["--backend", "memory"],
      ["--port", "-1"],
      ["--port", "65536"],
      ["--port", "1.5"],
      ["--port", "NaN"],
      ["--unknown", "value"],
    ]) {
      assert.throws(() => parseApiArguments(args, "node"), ValidationError);
    }
  });

  test("Task CLI covers commands and client error categories", async () => {
    const output: string[] = [];
    const errors: string[] = [];
    const client: TaskClient = {
      async create(input) {
        return { id: 1, title: input.title, completed: false };
      },
      async list(filter) {
        return [
          {
            id: 1,
            title: filter.completed ? "done" : "open",
            completed: !!filter.completed,
          },
        ];
      },
      async get(id) {
        return { id, title: "shown", completed: false };
      },
      async update(id, input) {
        return {
          id,
          title: input.title ?? "updated",
          completed: input.completed ?? false,
        };
      },
      async delete() {},
    };
    const io = {
      stdout: (line: string) => output.push(line),
      stderr: (line: string) => errors.push(line),
    };
    const run = (args: readonly string[]) => runCli(args, () => client, io);

    assert.equal(await run(["list"]), 0);
    assert.equal(await run(["list", "--completed", "false"]), 0);
    assert.equal(await run(["show", "1"]), 0);
    assert.equal(await run(["complete", "1"]), 0);
    assert.equal(
      await run(["update", "1", "--title", "renamed", "--completed", "true"]),
      0,
    );
    assert.equal(await run(["--timeout", "0", "list"]), 2);
    assert.equal(await run(["--base-url", "file:///tasks", "list"]), 2);
    assert.equal(await run(["update", "1", "--title"]), 2);
    assert.equal(await run(["list", "--completed", "yes"]), 2);
    assert.equal(await run(["unknown"]), 2);

    assert.equal(
      await runCli(
        ["list"],
        () => {
          throw new ApiError(404, "not_found", "missing");
        },
        io,
      ),
      3,
    );
    assert.equal(
      await runCli(
        ["list"],
        () => {
          throw new ClientProtocolError("invalid");
        },
        io,
      ),
      4,
    );
    assert.equal(
      await runCli(
        ["list"],
        () => {
          throw new ClientTransportError("offline");
        },
        io,
      ),
      5,
    );
    assert.equal(
      await runCli(
        ["list"],
        () => {
          throw new Error("unexpected");
        },
        io,
      ),
      4,
    );
    assert(output.length > 0);
    assert(errors.length > 0);
  });

  test("Task Fetch client rejects malformed and oversized responses", async () => {
    assert.throws(
      () => new FetchTaskClient({ baseUrl: "not a URL" }),
      ClientProtocolError,
    );
    assert.throws(
      () => new FetchTaskClient({ baseUrl: "https://user@example.test/" }),
      ClientProtocolError,
    );
    assert.throws(
      () => new FetchTaskClient({ baseUrl: "http://example.test/", timeoutMs: 0 }),
      ClientProtocolError,
    );
    assert.throws(
      () =>
        new FetchTaskClient({
          baseUrl: "http://example.test/",
          maximumResponseBytes: 0,
        }),
      ClientProtocolError,
    );

    const noJson = new FetchTaskClient({
      baseUrl: "http://example.test/",
      fetch: async () => new Response("{}", { status: 200 }),
    });
    await assert.rejects(() => noJson.get(1), ClientProtocolError);

    const invalidStatus = new FetchTaskClient({
      baseUrl: "http://example.test/",
      fetch: async () =>
        Response.json(
          { error: { code: "not_found", message: "missing" } },
          { status: 418 },
        ),
    });
    await assert.rejects(() => invalidStatus.get(1), ClientProtocolError);

    const invalidDetails = new FetchTaskClient({
      baseUrl: "http://example.test/",
      fetch: async () =>
        Response.json(
          {
            error: {
              code: "validation_error",
              message: "invalid",
              details: { nested: {} },
            },
          },
          { status: 422 },
        ),
    });
    await assert.rejects(() => invalidDetails.get(1), ClientProtocolError);

    const tooLarge = new FetchTaskClient({
      baseUrl: "http://example.test/",
      maximumResponseBytes: 1,
      fetch: async () =>
        new Response('{"id":1,"title":"x","completed":false}', {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    });
    await assert.rejects(() => tooLarge.get(1), ClientProtocolError);

    const unavailable = new FetchTaskClient({
      baseUrl: "http://example.test/",
      fetch: async () => {
        throw new Error("offline");
      },
    });
    await assert.rejects(() => unavailable.get(1), ClientTransportError);

    const deleted = new FetchTaskClient({
      baseUrl: "http://example.test/",
      fetch: async () =>
        new Response(null, {
          status: 204,
          headers: { "content-type": "application/json" },
        }),
    });
    await deleted.delete(1);
  });

  test("Task JSON, Markdown, and serial helpers reject malformed state", async () => {
    assert.deepEqual(parseStrictJsonBytes(bytes('[true,false,null,"x",1]'), 100), [
      true,
      false,
      null,
      "x",
      1,
    ]);
    assert.throws(() => parseStrictJsonBytes(bytes('"\\u0x00"'), 100), SyntaxError);
    assert.throws(() => parseStrictJsonBytes(bytes("01"), 100), SyntaxError);
    assert.throws(() => parseStrictJsonBytes(bytes("1e999"), 100), SyntaxError);
    assert.throws(() => parseStrictJsonBytes(Uint8Array.of(0xc3), 100), SyntaxError);

    assert.deepEqual(await readBoundedStream(null, 10), new Uint8Array());
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes("a"));
        controller.enqueue(bytes("b"));
        controller.close();
      },
    });
    assert.deepEqual(await readBoundedStream(stream, 2), bytes("ab"));
    const oversized = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes("too large"));
        controller.close();
      },
    });
    await assert.rejects(() => readBoundedStream(oversized, 1), /body exceeds/u);

    for (const source of [
      "",
      "<!-- rest-task-api:v2 next-id=1 -->\n# Tasks\n\n",
      "<!-- rest-task-api:v1 next-id=01 -->\n# Tasks\n\n",
      "<!-- rest-task-api:v1 next-id=1 -->\n# Tasks\n\n- [ ] 1: trailing \n",
      "<!-- rest-task-api:v1 next-id=2 -->\n# Tasks\n\n- [ ] 1: First\n- [x] 1: Again\n",
      "<!-- rest-task-api:v1 next-id=1 -->\n# Tasks\n\n- [ ] 1: First\n",
    ]) {
      assert.throws(() => parseMarkdownDocument(source), StorageError);
    }
    assert.equal(
      serializeMarkdownDocument({
        nextId: 2,
        tasks: [{ id: 1, title: "Done", completed: true }],
      }),
      "<!-- rest-task-api:v1 next-id=2 -->\n# Tasks\n\n- [x] 1: Done\n",
    );

    const serial = new SerialExecutor();
    await assert.rejects(() =>
      serial.run(async () => Promise.reject(new Error("fail"))),
    );
    assert.equal(await serial.run(async () => "next"), "next");
  });

  test("Task HTTP and Node adapters cover missing resources and lifecycle checks", async () => {
    const service = new TaskService(new MemoryRepository());
    assert.equal((await dispatchHttp(service, request("GET", "/missing"))).status, 404);
    assert.equal(
      (await dispatchHttp(service, request("GET", "/tasks?other=true"))).status,
      422,
    );
    assert.equal(
      (await dispatchHttp(service, request("POST", "/tasks", "{}", "text/plain")))
        .status,
      400,
    );
    assert.equal(
      (await dispatchHttp(service, request("DELETE", "/tasks/1"))).status,
      404,
    );

    const markdownPath = `${ROOT}/lifecycle.md`;
    await reset(markdownPath);
    const markdown = new NodeMarkdownRepository(markdownPath);
    assert.throws(() => markdown.update(1, {}), StorageError);
    await assert.rejects(() => markdown.delete(1), TaskNotFoundError);
    await markdown.close();
    assert.throws(() => markdown.list({}), /closed/u);

    const sqlitePath = `${ROOT}/lifecycle.db`;
    await reset(sqlitePath);
    const sqlite = new NodeSqliteRepository(sqlitePath);
    await assert.rejects(() => sqlite.update(1, {}), StorageError);
    await assert.rejects(() => sqlite.delete(1), TaskNotFoundError);
    await sqlite.close();
    await assert.rejects(() => sqlite.get(1), /closed/u);

    const serverPath = `${ROOT}/server.md`;
    await reset(serverPath);
    const repository = new NodeMarkdownRepository(serverPath);
    const server = await startNodeServer({
      service: new TaskService(repository),
      port: 0,
    });
    try {
      const tooLarge = await fetch(`${server.url}/tasks`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "x".repeat(64 * 1024 + 1),
      });
      assert.equal(tooLarge.status, 400);
    } finally {
      await server.close();
      await repository.close();
    }
  });
}
