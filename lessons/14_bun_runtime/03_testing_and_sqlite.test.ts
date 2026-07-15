import { Database } from "bun:sqlite";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";

describe("bun:test hooks and mocks", () => {
  const events: string[] = [];

  beforeAll(() => events.push("beforeAll"));
  beforeEach(() => events.push("beforeEach"));
  afterEach(() => events.push("afterEach"));
  afterAll(() => {
    events.push("afterAll");
    expect(events.filter((event) => event === "beforeAll")).toHaveLength(1);
    expect(events.filter((event) => event === "afterAll")).toHaveLength(1);
  });

  test("mock functions record calls", () => {
    const format = mock((value: number) => `task-${value}`);

    expect(format(3)).toBe("task-3");
    expect(format).toHaveBeenCalledWith(3);
  });

  test(
    "retry and timeout are explicit policy",
    () => {
      expect(Bun.version).toMatch(/^1\./);
    },
    { retry: 1, timeout: 1_000 },
  );
});

test.concurrent("independent concurrent case A", async () => {
  await Bun.sleep(1);
  expect(new Blob(["A"]).size).toBe(1);
});

test.concurrent("independent concurrent case B", async () => {
  await Bun.sleep(1);
  expect(new Blob(["BB"]).size).toBe(2);
});

test.serial("bun:sqlite remains serial when sharing one connection", () => {
  using database = new Database(":memory:", { strict: true });
  database.run(`
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0
    )
  `);
  const insert = database.query("INSERT INTO tasks (title) VALUES (?1)");
  const select = database.query<
    { id: number; title: string; completed: number },
    [string]
  >("SELECT id, title, completed FROM tasks WHERE title = ?1");

  insert.run("Test Bun SQLite");

  expect(select.get("Test Bun SQLite")).toEqual({
    id: 1,
    title: "Test Bun SQLite",
    completed: 0,
  });
});

// Run `bun test --coverage lessons/14_bun_runtime/03_testing_and_sqlite.test.ts`
// to collect coverage. A percentage measures execution, not assertion quality.
