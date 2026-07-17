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

OpenAPI supplies the cross-language structural shapes. The SPEC supplements
those shapes with semantic requirements that OpenAPI does not fully encode:
JavaScript-safe positive IDs, trimmed control- and surrogate-free titles, and
exact `Allow` headers.

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
  --lock=deno.lock \
  --allow-net=127.0.0.1 \
  --allow-read=projects/tasks/.test-data/run \
  --allow-write=projects/tasks/.test-data/run \
  projects/tasks/solution/runtimes/deno/api-main.ts \
  --backend markdown --data projects/tasks/.test-data/run/deno.md --port 8000

deno run \
  --lock=deno.lock \
  --allow-net=127.0.0.1 \
  projects/tasks/solution/runtimes/deno/cli-main.ts \
  --base-url http://127.0.0.1:8000 list
```

Markdown mode needs only loopback network access plus read/write access to the
data directory. For SQLite, `deno task tasks:test` resolves the loader cache
from `DENO_DIR` or the platform default:

| Platform | Default Deno cache root                        |
| -------- | ---------------------------------------------- |
| Linux    | `$XDG_CACHE_HOME/deno`, or `$HOME/.cache/deno` |
| macOS    | `$HOME/Library/Caches/deno`                    |
| Windows  | `%LOCALAPPDATA%\deno`                          |

Set `DENO_DIR` explicitly to use another cache root. A direct SQLite server
needs FFI, the named loader variables, scoped loopback/GitHub access, and
read/write access to its selected cache's `plug` directory:

An empty `DENO_DIR` or `XDG_CACHE_HOME` is treated as unset, matching Deno's
cache resolution.

```bash
# POSIX shells
DENO_DIR=/absolute/path/to/deno-cache deno task tasks:test

# PowerShell
$env:DENO_DIR = "C:\path\to\deno-cache"
deno task tasks:test
```

```bash
# For example, set this to the platform-appropriate cache root.
export DENO_DIR=/absolute/path/to/deno-cache
deno run \
  --lock=deno.lock \
  --allow-net=127.0.0.1,github.com,release-assets.githubusercontent.com \
  --allow-env=DENO_DIR,XDG_CACHE_HOME,HOME,LOCALAPPDATA,DENO_SQLITE_PATH,DENO_SQLITE_LOCAL \
  --allow-ffi \
  --allow-read="$DENO_DIR/plug" \
  --allow-read=projects/tasks/.test-data/run \
  --allow-write="$DENO_DIR/plug" \
  --allow-write=projects/tasks/.test-data/run \
  projects/tasks/solution/runtimes/deno/api-main.ts \
  --backend sqlite --data projects/tasks/.test-data/run/deno.db --port 8000
```

An uncached native library uses the same scoped GitHub and cache-write grants;
the committed Tasks commands do not require a blanket permission grant.

```bash
bun projects/tasks/solution/runtimes/bun/api-main.ts \
  --backend sqlite --data projects/tasks/.test-data/run/bun.db --port 8000

bun projects/tasks/solution/runtimes/bun/cli-main.ts \
  --base-url http://127.0.0.1:8000 complete 1
```

Replace `sqlite` with `markdown` and use a `.md` data path on any server. The
backends are independent and do not synchronize data.

## Direct validation

The root scripts run the selected implementation (default: `solution`):

```bash
TASKS_IMPLEMENTATION=solution npm run check:tasks:node
TASKS_IMPLEMENTATION=solution deno task tasks:check
TASKS_IMPLEMENTATION=solution npm run check:tasks:bun
npm run portability:tasks
npm run test:tasks:interoperability
```

The untouched starter intentionally fails those substantive contracts with
`IncompleteProjectError`; separate checks verify that its constructors and
operations remain side-effect-free.

`deno.lock` is the frozen root lockfile for the course and Tasks project. The
finite interoperability command starts six server/backend cells and nine
cross-runtime SQLite client/server cells.

Start a starter entry point to see the deliberate incomplete failure:

```bash
node --experimental-strip-types \
  projects/tasks/starter/runtimes/node/api-main.ts
```

## Persistence and lifecycle limits

- SQLite uses schema version `1`, `AUTOINCREMENT`, checked Boolean storage,
  parameterized statements, and short mutation transactions. Node
  feature-detects defensive mode across supported Node 24+ releases, sets a
  5-second busy timeout, and reads statement integers as `bigint`; Bun enables
  strict and safe-integer modes; Deno enables `int64`, finalizes every statement,
  and uses immediate native transaction wrappers. Every adapter narrows IDs back
  to safe numbers.
- Markdown uses exactly
  `<!-- rest-task-api:v1 next-id=N -->`, ordered checklist rows, one final
  newline, a sibling temporary file, close/flush where exposed, and atomic
  rename.
- Every repository and server has one explicit owner and idempotent close.
- One process may own one writer for a Markdown path. Cross-process locking and
  crash recovery between filesystem operations are intentionally unsupported.
- Servers bind to loopback in examples. They are educational, not production
  deployment guidance.

## Course integration

The root configuration runs strict Node and Bun type checks, native runtime
tests, Deno formatting/linting/checking/docs/audits, an OpenAPI 3.1 parser
check, a Node coverage gate, and portable/core plus subprocess interoperability
evidence. The project uses no framework, ORM, or runtime dependency beyond
Deno's pinned `jsr:@db/sqlite@0.13.0` adapter.
