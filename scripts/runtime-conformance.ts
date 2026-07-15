import { TaskManager } from "../project/task-core/manager.ts";
import { TaskNotFoundError, type TaskStorage } from "../project/task-core/storage.ts";
import { normalizeTitle, type Task } from "../project/task-core/task.ts";
import {
  findCompatibleRuntimes,
  type RuntimeProfile,
} from "../exercises/15_runtime_portability/solution.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

class ConformanceStorage implements TaskStorage {
  readonly #tasks = new Map<number, Task>();
  #nextId = 1;

  async list(): Promise<readonly Task[]> {
    return [...this.#tasks.values()].map((task) => ({ ...task }));
  }

  async add(title: string): Promise<Task> {
    const task = {
      id: this.#nextId,
      title: normalizeTitle(title),
      completed: false,
    };
    this.#nextId += 1;
    this.#tasks.set(task.id, task);
    return { ...task };
  }

  async complete(id: number): Promise<Task> {
    const task = this.#tasks.get(id);
    if (task === undefined) {
      throw new TaskNotFoundError(id);
    }
    const completed = { ...task, completed: true };
    this.#tasks.set(id, completed);
    return { ...completed };
  }

  async remove(id: number): Promise<void> {
    if (!this.#tasks.delete(id)) {
      throw new TaskNotFoundError(id);
    }
  }
}

const manager = new TaskManager(new ConformanceStorage());
const created = await manager.add("Cross-runtime conformance");
const completed = await manager.complete(created.id);
assert(completed.completed, "Task completion must persist");
assert((await manager.list()).length === 1, "Task list must contain one task");
await manager.remove(created.id);
assert((await manager.list()).length === 0, "Task removal must persist");

const profiles: readonly RuntimeProfile[] = [
  {
    name: "Node.js",
    defaultDenyPermissions: false,
    nodeCompatibility: "reference",
    nativeBundler: false,
    nativeSqlite: true,
  },
  {
    name: "Deno",
    defaultDenyPermissions: true,
    nodeCompatibility: "high",
    nativeBundler: true,
    nativeSqlite: false,
  },
  {
    name: "Bun",
    defaultDenyPermissions: false,
    nodeCompatibility: "high",
    nativeBundler: true,
    nativeSqlite: true,
  },
];

assert(
  findCompatibleRuntimes(profiles, {
    nativeBundler: true,
    nativeSqlite: true,
  }).join(",") === "Bun",
  "Runtime capability filtering must be deterministic",
);

const digest = await crypto.subtle.digest(
  "SHA-256",
  new TextEncoder().encode("learning-typescript"),
);
assert(digest.byteLength === 32, "Web Crypto SHA-256 must produce 32 bytes");

const runtime = Reflect.has(globalThis, "Deno")
  ? "Deno"
  : Reflect.has(globalThis, "Bun")
    ? "Bun"
    : "Node.js";

console.log(`${runtime} conformance passed`);
