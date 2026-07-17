# Task REST API across Node, Deno, and Bun

Build one Task application with a strict shared TypeScript core, then run it
through the native HTTP and SQLite APIs of Node, Deno, and Bun. Every runtime
also implements the exact versioned Markdown checklist repository and uses one
portable Fetch client and CLI policy.

This project belongs after the SQL/SQLite, HTTP/JSON, testing, and runtime
portability lessons and before the final capstones.

## Contract

- [`docs/SPEC.md`](docs/SPEC.md) preserves the portable observable behavior
  while adapting architecture wording to TypeScript, Node, Deno, and Bun.
- [`docs/openapi.yaml`](docs/openapi.yaml) is the byte-identical OpenAPI 3.1
  contract.
- [`docs/PLAN.md`](docs/PLAN.md) and [`docs/PROMPT.md`](docs/PROMPT.md) describe
  the language-neutral adaptation process.

The contract supports `add`, `list`, `show`, `update`, `complete`, and `remove`.
It deliberately excludes frameworks, ORMs, authentication, retries, UI, and
deployment.

## Architecture

`starter/` and `solution/` have matching public trees:

```text
{starter,solution}/
├── core/                      Task values, DTO validation, errors, service,
│                              strict JSON, HTTP dispatch, CLI, lifecycle
├── storage/                   Markdown v1 parser/serializer and write queue
├── client/                    one strict, bounded Fetch implementation
└── runtimes/
    ├── node/                  node:http, node:sqlite, native atomic files
    ├── deno/                  Deno.serve, jsr:@db/sqlite, Deno files
    └── bun/                   Bun.serve, bun:sqlite, Bun files
```

Dependencies point inward. Runtime adapters know the core; the core imports no
runtime SQLite or server API. Deno dynamically imports
`jsr:@db/sqlite@0.13.0` only when `--backend sqlite` is selected, so a
Markdown-only process does not require FFI.

The untouched starter imports and type-checks. Every incomplete operation throws
the stable `IncompleteProjectError` message prefix `starter incomplete:`. Its
repository constructors and entry points do not create storage.

## Five milestones

1. **Domain and contracts** — readonly Task values, safe IDs, exact DTOs, typed
   errors, the async repository port, and service.
2. **Persistence** — all six SQLite/Markdown adapters, schema checks, restart
   persistence, monotonic IDs, corruption detection, and atomic Markdown saves.
3. **Client and HTTP boundary** — recursive duplicate-key rejection, bounded
   UTF-8 JSON, shared dispatch, Fetch response validation, and CLI policy.
4. **Native servers** — streamed `node:http`, `Deno.serve` with
   `AbortController`/`finished`, and `Bun.serve`.
5. **Interoperability** — six server/backend cells and nine cross-runtime
   SQLite client/server cells.

Attempt each starter milestone before reading the corresponding solution.

## Direct run commands

Run from the repository root. Store local data below an ignored `.test-data`
directory:

```bash
mkdir -p projects/tasks/.test-data/run

node --experimental-strip-types \
  projects/tasks/solution/runtimes/node/api-main.ts \
  --backend sqlite --data projects/tasks/.test-data/run/node.db --port 8000

node --experimental-strip-types \
  projects/tasks/solution/runtimes/node/cli-main.ts \
  --base-url http://127.0.0.1:8000 add "Learn REST"
```

```bash
deno run \
  --lock=projects/tasks/deno.lock \
  --allow-net=127.0.0.1 \
  --allow-read=projects/tasks/.test-data/run \
  --allow-write=projects/tasks/.test-data/run \
  projects/tasks/solution/runtimes/deno/api-main.ts \
  --backend markdown --data projects/tasks/.test-data/run/deno.md --port 8000

deno run \
  --lock=projects/tasks/deno.lock \
  --allow-net=127.0.0.1 \
  projects/tasks/solution/runtimes/deno/cli-main.ts \
  --base-url http://127.0.0.1:8000 list
```

Markdown mode needs only loopback network access plus read/write access to the
data directory. For a cached SQLite native library, the minimum additional
permissions are the three loader environment variables, FFI, and read access to
the loader cache; a file database also needs scoped data access:

```bash
deno_dir="${DENO_DIR:-$HOME/.cache/deno}"
deno run \
  --lock=projects/tasks/deno.lock \
  --allow-net=127.0.0.1 \
  --allow-env=DENO_DIR,DENO_SQLITE_PATH,DENO_SQLITE_LOCAL \
  --allow-ffi \
  --allow-read="$deno_dir/plug,projects/tasks/.test-data/run" \
  --allow-write=projects/tasks/.test-data/run \
  projects/tasks/solution/runtimes/deno/api-main.ts \
  --backend sqlite --data projects/tasks/.test-data/run/deno.db --port 8000
```

An uncached first download needs temporary network/cache-write permission; the
upstream package documents `-A` as the portable bootstrap invocation.

```bash
bun projects/tasks/solution/runtimes/bun/api-main.ts \
  --backend sqlite --data projects/tasks/.test-data/run/bun.db --port 8000

bun projects/tasks/solution/runtimes/bun/cli-main.ts \
  --base-url http://127.0.0.1:8000 complete 1
```

Replace `sqlite` with `markdown` and use a `.md` data path on any server. The
backends are independent and do not synchronize data.

## Direct validation

These commands need no root script changes:

```bash
node --experimental-strip-types --test projects/tasks/tests/node.test.ts
deno test -A --lock=projects/tasks/deno.lock projects/tasks/tests/deno.test.ts
bun test projects/tasks/tests/bun.test.ts

node --experimental-strip-types projects/tasks/tests/interoperability.ts

deno check --lock=projects/tasks/deno.lock \
  projects/tasks/solution/runtimes/deno/api-main.ts \
  projects/tasks/solution/runtimes/deno/cli-main.ts \
  projects/tasks/tests/deno.test.ts

bun build projects/tasks/solution/runtimes/bun/api-main.ts \
  projects/tasks/solution/runtimes/bun/cli-main.ts \
  --target=bun --outdir=projects/tasks/.test-data/bun-build
```

Start a starter entry point to see the deliberate incomplete failure:

```bash
node --experimental-strip-types \
  projects/tasks/starter/runtimes/node/api-main.ts
```

## Persistence and lifecycle limits

- SQLite uses schema version `1`, `AUTOINCREMENT`, checked Boolean storage,
  parameterized statements, and short mutation transactions. Node enables
  defensive mode twice for version compatibility, sets a 5-second busy timeout,
  and reads statement integers as `bigint`; Bun enables strict and safe-integer
  modes; Deno enables `int64`, finalizes every statement, and uses immediate
  native transaction wrappers. Every adapter narrows IDs back to safe numbers.
- Markdown uses exactly
  `<!-- rest-task-api:v1 next-id=N -->`, ordered checklist rows, one final
  newline, a sibling temporary file, close/flush where exposed, and atomic
  rename.
- Every repository and server has one explicit owner and idempotent close.
- One process may own one writer for a Markdown path. Cross-process locking and
  crash recovery between filesystem operations are intentionally unsupported.
- Servers bind to loopback in examples. They are educational, not production
  deployment guidance.

## Root integration intentionally deferred

The project is directly runnable, but the repository owner still needs to:

1. include `projects/tasks` in the Node and Bun TypeScript configurations;
2. add root format, lint, type-check, test, coverage, and interoperability
   scripts;
3. merge the project-local Deno lock entries into the chosen root lock/task
   workflow;
4. integrate OpenAPI validation with exact
   `@readme/openapi-parser@6.3.0`; and
5. link the project from the renumbered curriculum and root course docs.

Those files are intentionally untouched because they are owned by concurrent
integration work.
