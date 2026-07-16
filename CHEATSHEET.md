# 🗒️ TypeScript and Runtime Cheat Sheet

Use this after learning a concept. It is a reminder, not a replacement for the
lesson, experiment, and exercise.

## ⌨️ Commands

```bash
node file.js                       # run JavaScript
npm run lesson -- file.ts          # run TypeScript with tsx
npm run typecheck:node             # strict Node source checking
npm run typecheck:bun              # strict Bun source checking
npm run format                     # apply Prettier
npm run lint                       # run ESLint
npm run course:node                # run Node lessons and solutions
npm run test:node                  # run Node-discovered tests
npm run test:project               # run capstone tests
npm run test:capstone:comparative  # run the selected comparative target
npm run test:capstone:comparative:contention # repeat real SQLite races
npm run coverage                   # enforce capstone coverage
npm run check                      # standard Node course check
npm run check:deno                 # full Deno validation
npm run check:bun                  # full Bun validation
npm run build:bun                  # Bun bundle and compile smoke

deno task check                    # same Deno validation natively
npm run portability               # shared runtime conformance
```

## 🧱 Bindings, values, and operators

```typescript
const language = "TypeScript";
let attempts = 0;
attempts += 1;

const total = 3 * 4;
const valid = total >= 10 && total < 20;
const message = `${language}: ${total}`;
```

Prefer `const`, explicit conversion, `===`, and `!==`.

```typescript
const count = Number("42");
const label = String(count);
const enabled = Boolean(count);
```

`null` is an intentional empty value; `undefined` usually means missing or not
assigned. `typeof null` is the historical value `"object"`.

## 🧩 Control flow and functions

```typescript
if (score >= 90) {
  console.log("excellent");
} else if (score >= 60) {
  console.log("passing");
} else {
  console.log("retry");
}

for (const item of items) {
  console.log(item);
}

function greet(name: string, punctuation = "!"): string {
  return `Hello, ${name}${punctuation}`;
}

const double = (value: number): number => value * 2;
```

Use `for...of` for values. Use `for...in` only when object property names are
the intended data.

## 🧺 Arrays, objects, maps, and sets

```typescript
const numbers: number[] = [1, 2, 3];
const doubled = numbers.map((value) => value * 2);
const positive = numbers.filter((value) => value > 0);

const task = { id: 1, title: "Learn", completed: false };
const completed = { ...task, completed: true };
const { id, title } = task;

const byId = new Map<number, string>([[1, "Learn"]]);
const tags = new Set(["typescript", "node"]);
```

Object and array spread is shallow. Nested objects remain shared unless copied
separately.

## 🗂️ Modules

```typescript
// task.ts
export interface Task {
  readonly id: number;
  readonly title: string;
}

export function formatTask(task: Task): string {
  return `${task.id}: ${task.title}`;
}

// main.ts
import { formatTask, type Task } from "./task.ts";
```

This course uses ES modules, explicit extensions, `"type": "module"`, and
`import type` for type-only dependencies.

## 🧬 TypeScript foundations

```typescript
const inferred = "string";
const annotated: string = "string";
const pair: readonly [string, number] = ["age", 42];
const callback: (value: number) => string = (value) => String(value);
```

Use inference for obvious locals and annotations at public boundaries.

```typescript
function stringify(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Error) {
    return value.message;
  }
  return JSON.stringify(value);
}
```

Use `unknown` for untrusted values. Avoid `any`, which disables useful checks.

## 🧬 Type aliases, interfaces, and unions

```typescript
type Identifier = number;

interface Task {
  readonly id: Identifier;
  title: string;
  completed?: boolean;
}

type Result<T> =
  | { readonly kind: "success"; readonly value: T }
  | { readonly kind: "failure"; readonly error: Error };

function unwrap<T>(result: Result<T>): T {
  switch (result.kind) {
    case "success":
      return result.value;
    case "failure":
      throw result.error;
  }
}
```

Literal discriminants make invalid states harder to represent and allow
exhaustive narrowing.

## 🧬 Generics and utility types

```typescript
function first<T>(items: readonly T[]): T | undefined {
  return items[0];
}

function findById<T extends { readonly id: number }>(
  items: readonly T[],
  id: number,
): T | undefined {
  return items.find((item) => item.id === id);
}

type TaskSummary = Pick<Task, "id" | "title">;
type TaskUpdate = Partial<Pick<Task, "title" | "completed">>;
type StoredTask = Readonly<Task>;
```

Useful built-ins include `Pick`, `Omit`, `Partial`, `Required`, `Readonly`,
`Record`, `Awaited`, `Parameters`, and `ReturnType`.

## 🧩 Classes, composition, and dependency injection

```typescript
interface Writer {
  write(text: string): Promise<void>;
}

class Reporter {
  constructor(private readonly writer: Writer) {}

  report(text: string): Promise<void> {
    return this.writer.write(text);
  }
}
```

TypeScript is structurally typed: a value satisfies `Writer` when it has the
required shape. Depend on the smallest capability the consumer needs.

## 🚨 Errors and runtime validation

```typescript
try {
  await operation();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
}
```

Type annotations do not validate JSON:

```typescript
const value: unknown = JSON.parse(text);
if (typeof value !== "object" || value === null) {
  throw new TypeError("expected an object");
}
```

Validate command arguments, environment variables, files, JSON, database rows,
and HTTP bodies at the boundary.

## 📁 Files and paths

```typescript
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const file = join("data", "tasks.json");
await writeFile(file, `${JSON.stringify(tasks, null, 2)}\n`, "utf8");
const text = await readFile(file, "utf8");
```

Use `try`/`finally` for cleanup and write to a temporary file before renaming
when a partially written file would be dangerous.

Atomic replacement prevents torn documents, not lost updates. The Node capstone
adds cross-process locking. Its Deno and Bun file adapters serialize writes only
inside one process and do not lock across processes.

## ⚡ Promises, cancellation, and concurrency

```typescript
const value = await Promise.resolve(42);

const controller = new AbortController();
const response = await fetch(url, { signal: controller.signal });

const results = await Promise.all(items.map((item) => processItem(item)));
```

`Promise.all` is not a concurrency limit. Use workers or a queue when the number
of simultaneous operations must be bounded. Pass `AbortSignal` through every
layer that can stop work.

## 🌐 HTTP

```typescript
const response = await fetch("http://127.0.0.1:8080/tasks", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ title: "Learn HTTP" }),
});

if (!response.ok) {
  throw new Error(`HTTP ${response.status}`);
}
const body: unknown = await response.json();
```

Validate method, path, content type, body size, JSON syntax, and decoded shape.
Use status `201` for creation, `204` for successful empty responses, `400` for
invalid input, `404` for missing resources, and `500` for unexpected failures.

## 🗄️ SQLite

```typescript
import { DatabaseSync } from "node:sqlite";

const database = new DatabaseSync(":memory:");
const statement = database.prepare("INSERT INTO tasks (title) VALUES (?)");
statement.run(title);
database.close();
```

Bind parameters instead of interpolating SQL. Use transactions when related
writes must commit or roll back together.

## 🧪 Testing

```typescript
import assert from "node:assert/strict";
import test from "node:test";

test("normalizes a title", () => {
  assert.equal(normalizeTitle("  Learn  "), "Learn");
});

test("rejects invalid input", async () => {
  await assert.rejects(asyncOperation(), /invalid/);
});
```

Use `assert.throws` for synchronous failures and `assert.rejects` for rejected
promises. Control time, files, randomness, and network boundaries.

## 🌐 Runtime portability

| Concern         | Node.js                    | Deno                | Bun                   |
| --------------- | -------------------------- | ------------------- | --------------------- |
| Course baseline | 24 LTS / 26 Current        | 2.9.3               | 1.3.14                |
| Run TypeScript  | `node` stripping or `tsx`  | `deno run`          | `bun run`             |
| Type-check      | `tsc`                      | `deno check`        | `tsc`                 |
| Config          | `tsconfig.node.json`       | `deno.json`         | `tsconfig.bun.json`   |
| Lockfile        | `package-lock.json`        | `deno.lock`         | `bun.lock`            |
| Permissions     | optional restriction model | default-deny grants | process authority     |
| Tests           | `node:test`                | `Deno.test`         | `bun:test`            |
| HTTP            | `node:http`                | `Deno.serve`        | `Bun.serve`           |
| SQLite          | `node:sqlite`              | package required    | `bun:sqlite`          |
| Distribution    | `npm pack --dry-run`       | `deno compile`      | `bun build --compile` |

## 🔐 Runtime permissions

```bash
# Node restrictions are opt-in and are not a malicious-code sandbox
node --permission --allow-fs-read=tasks.json app.ts

# Deno denies sensitive I/O until a resource is granted
deno run --allow-read=tasks.json --allow-write=tasks.json app.ts
```

Bun inherits operating-system process authority. Use filesystem permissions,
containers, service accounts, and deployment policy for isolation.

## 🧪 Native runtime tests

```bash
node --test
deno test
bun test
```

Use native tests for native authority and lifecycle behavior. Use
`scripts/runtime-conformance.ts` only for behavior intentionally shared by all
three runtimes.

## 📦 Runtime build commands

```bash
npm pack --dry-run
deno task compile
npm run build:bun
```

Prefer ES modules, explicit extensions, Web APIs, and small runtime adapters.
Portability is established by running executable evidence on each claimed
runtime.
