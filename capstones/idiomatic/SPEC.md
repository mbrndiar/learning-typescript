# Idiomatic capstone specification: cross-runtime event relay

## Status and interpretation

This is the learner contract for the required TypeScript idiomatic capstone,
equal in weight to the comparative SQLite key/value capstone. Observable event
semantics, commands, files, HTTP behavior, errors, and acceptance criteria are
normative. Internal class/module architecture is not.

The removed connected Task project is a historical predecessor, not part of
this contract. Its [final pre-removal source][legacy-project] does not change the
relay's acceptance criteria.

## Bounded problem

Build one runtime-neutral TypeScript relay core and thin Node.js, Deno, and Bun
adapters. Each adapter can:

- read newline-delimited JSON events from stdin or a file;
- validate and normalize untrusted values;
- assign deterministic relay sequence numbers;
- route accepted events through a bounded asynchronous queue;
- append accepted events to a versioned, single-writer JSON Lines log;
- replay/filter that log; and
- expose one small loopback HTTP ingestion/query service.

This is an event-stream and runtime-capability project. It is not task CRUD,
generic key/value storage, a database, or a distributed message broker.

## Learning goals and course mapping

| Course material | Capstone outcome |
| --- | --- |
| [Modules 1–4](../../README.md) | Use JavaScript values/functions/modules, then strict TypeScript to describe runtime-independent behavior. |
| [Module 5: modeling valid data](../../lessons/05_modeling_valid_data/README.md) | Narrow `unknown`, use discriminated unions, and make invalid states unrepresentable after parsing. |
| [Module 6: reusable typed code](../../lessons/06_reusable_typed_code/README.md) | Define small generic/capability interfaces and compose behavior without runtime-specific imports in the core. |
| [Module 7: errors, files, JSON, and packages](../../lessons/07_errors_files_json_and_packages/README.md) | Validate external JSON, model typed failures, and own file resources. |
| [Module 8: testing](../../lessons/08_testing/README.md) | Reuse behavioral contracts through Node, Deno, and Bun test wrappers. |
| [Module 9: tooling, CLI, and observability](../../lessons/09_tooling_debugging_cli_observability/README.md) | Provide stable CLI streams, diagnostics, format/lint/type gates, and executable scripts. |
| [Module 10: async and concurrency](../../lessons/10_async_and_concurrency/README.md) | Use promises, async iterables, bounded backpressure, `AbortSignal`, and deterministic cleanup. |
| [Module 11: SQL and SQLite](../../lessons/11_sql_and_sqlite/README.md) | Use database constraints, parameter binding, transactions, and deterministic handle cleanup. |
| [Module 12: REST APIs and HTTP clients](../../lessons/12_rest_apis_and_http_clients/README.md) | Implement bounded JSON HTTP requests/responses and graceful service shutdown. |
| [Modules 13–15](../../lessons/13_nodejs_runtime/README.md) | Implement explicit Node, [Deno](../../lessons/14_deno_runtime/README.md), and [Bun](../../lessons/15_bun_runtime/README.md) process/file/server/test adapters. |
| [Module 16: runtime portability](../../lessons/16_runtime_portability/README.md) | Prove capability-based portability by running one framework-free contract under all three runtimes. |

## Normative event model

Input is one of two closed variants.

Metric event:

```json
{
  "kind": "metric",
  "id": "evt-001",
  "source": "checkout",
  "observedAt": "2026-07-16T08:00:00Z",
  "name": "request.duration_ms",
  "value": 125,
  "tags": {"route": "/cart", "region": "eu"}
}
```

Alert event:

```json
{
  "kind": "alert",
  "id": "evt-002",
  "source": "checkout",
  "observedAt": "2026-07-16T08:01:00+00:00",
  "code": "UPSTREAM_TIMEOUT",
  "severity": "info",
  "message": "catalog request timed out"
}
```

Shared rules:

- input must be a non-null, non-array object with no unknown properties;
- `id` matches `[A-Za-z0-9][A-Za-z0-9._:-]{0,63}`;
- `source` is a trimmed 1–64 character string without control characters;
- `observedAt` is RFC 3339 with `Z` or numeric offset and normalizes to UTC
  millisecond form `YYYY-MM-DDTHH:MM:SS.sssZ`;
- strings are not Unicode-normalized;
- object member order is not significant;
- duplicate JSON object names use standard `JSON.parse` last-member-wins
  semantics before shape validation.

Metric rules:

- `name` matches `[A-Za-z][A-Za-z0-9_.-]{0,63}`;
- `value` is a finite JSON number; `-0` normalizes to `0`;
- `tags` is optional, has at most 16 own properties, each key matches
  `[A-Za-z][A-Za-z0-9_.-]{0,31}`, and each value is a control-free string of at
  most 64 characters.

Alert rules:

- `code` matches `[A-Z][A-Z0-9_]{0,63}`;
- `severity` is `info`, `warning`, or `error`;
- `message` is trimmed, control-free, and 1–256 characters.

The normalized event preserves its variant and receives a positive safe-integer
`sequence` assigned by the log. The first event is `1`; reopening a valid log
continues at the previous maximum plus one.

## Public TypeScript boundary

The runtime-neutral core must export equivalent public declarations from both
starter and solution:

```ts
type IncomingEvent = MetricEvent | AlertEvent;
type StoredEvent = IncomingEvent & { readonly sequence: number };

type ParseResult =
  | { readonly ok: true; readonly event: IncomingEvent }
  | { readonly ok: false; readonly error: RelayError };

interface EventLog {
  append(event: IncomingEvent, signal?: AbortSignal): Promise<StoredEvent>;
  replay(query: ReplayQuery, signal?: AbortSignal): AsyncIterable<StoredEvent>;
}

interface Subscriber {
  accept(event: StoredEvent, signal: AbortSignal): Promise<void>;
}
```

`parseEvent(value: unknown): ParseResult` is pure and never throws for malformed
input. Concrete classes, factories, queue algorithms, and file helpers are not
prescribed. The core must not import `node:*`, `Deno`, `Bun`, or runtime-only
types/globals.

## Versioned append log

The UTF-8 JSONL log has these semantic records:

```json
{"record":"header","schemaVersion":1}
{"record":"event","sequence":1,"event":{"kind":"alert","id":"evt-002","source":"checkout","observedAt":"2026-07-16T08:01:00.000Z","code":"UPSTREAM_TIMEOUT","severity":"info","message":"catalog request timed out"}}
```

Rules:

- a new log starts with exactly one version-1 header;
- event records have contiguous sequences starting at `1`;
- every non-empty physical line is one complete JSON object;
- blank lines, malformed/truncated JSON, unknown record kinds, unsupported
  versions, invalid events, duplicate/non-contiguous sequences, or data before
  the header make the entire log `log_corrupt`;
- the relay never silently truncates or repairs a corrupt log;
- the default capacity is 10,000 events, configurable from `1..100_000`;
  appending beyond capacity returns `log_full`;
- one relay instance is the sole writer. Cross-process writers and locking are
  explicitly unsupported;
- an append is successful only after the adapter's write promise/operation
  completes. Cross-runtime power-loss durability is not promised.

JSON object order and insignificant whitespace are not normative. Replay emits
events by ascending sequence.

## Observable CLI

From the repository root, `<impl>` is `starter` or `solution`:

```bash
# Node.js
npx tsx capstones/idiomatic/<impl>/node/main.ts \
  ingest --log PATH [--input FILE|-] [--capacity N]
npx tsx capstones/idiomatic/<impl>/node/main.ts \
  replay --log PATH [--after N] [--kind metric|alert] [--source VALUE] [--limit N]
npx tsx capstones/idiomatic/<impl>/node/main.ts \
  serve --log PATH [--host 127.0.0.1] [--port 8080] [--queue-capacity N]

# Deno: permissions must name only required paths and loopback network access
deno run --allow-read=LOG_DIRECTORY,INPUT_FILE --allow-write=LOG_DIRECTORY \
  capstones/idiomatic/<impl>/deno/main.ts \
  ingest --log LOG_DIRECTORY/events.jsonl --input INPUT_FILE

# Bun
bun run capstones/idiomatic/<impl>/bun/main.ts replay --log PATH
```

When `--input -` is used, omit `INPUT_FILE`; the log directory remains required
because the adapter may create the directory and log. `serve` additionally
requires `--allow-net=HOST:PORT`, scoped to a loopback address. No relay command
requires environment, subprocess, FFI, or system permission.

All runtimes accept the same subcommands/options. `--after` defaults to `0`;
`--limit` is `1..1_000`, default `100`; `--queue-capacity` is `1..1_024`,
default `64`. Unknown options and positional arguments fail.

### Ingest stream

Each non-empty input line is parsed independently. Processing continues after
invalid lines. Stdout emits one result line per non-empty input line:

```json
{"ok":true,"line":1,"event":{"kind":"metric","id":"evt-001","source":"checkout","observedAt":"2026-07-16T08:00:00.000Z","name":"request.duration_ms","value":125,"tags":{"region":"eu","route":"/cart"},"sequence":1}}
{"ok":false,"line":2,"error":{"code":"invalid_event","path":"severity","message":"severity must be info, warning, or error"}}
```

Tag keys are emitted in Unicode code-point order. A run containing invalid
lines exits `3` after processing all lines; valid lines remain appended. A log
or I/O error stops further input immediately.

### Replay stream

Replay writes one normalized `StoredEvent` JSON object per line, with filters
combined by logical AND. `after` is exclusive. `limit` is applied after
filtering. An empty result writes nothing and succeeds.

### Relay/backpressure semantics

Accepted events are appended before they become visible to subscribers. Events
enter a bounded FIFO queue. When the queue is full, producers await capacity;
events are never silently dropped or reordered. A subscriber failure is
reported and stops the relay rather than acknowledging later events. An ingest
success line or HTTP `201` is emitted only after the append and every registered
subscriber has accepted that event. If delivery fails after append, the failure
includes the assigned sequence; the persisted record is not rolled back.

On cancellation, the service stops accepting new input, lets already appended
events finish delivery, closes subscribers/log handles, and resolves shutdown.
Tests control cancellation with `AbortController`; timing is not contractual.

## HTTP boundary

`serve` binds only to the requested host; required examples use `127.0.0.1`.

| Request | Behavior |
| --- | --- |
| `GET /healthz` | `200 {"status":"ok"}` while accepting work |
| `POST /v1/events` | Accept one event JSON object; `201` with stored event |
| `GET /v1/events?after=0&kind=alert&source=x&limit=100` | `200` with `{"events":[...]}` |

POST requires `Content-Type: application/json`, a declared/streamed body no
larger than 64 KiB, and exactly one JSON value with no trailing non-whitespace.
Query values use the same bounds as the CLI. Success and error bodies use
`application/json; charset=utf-8`.

Error body:

```json
{
  "error": {
    "code": "invalid_event",
    "message": "event validation failed",
    "details": {"path": "severity"}
  }
}
```

Required status mapping:

- `400`: malformed JSON/query or invalid event;
- `404`: unknown path;
- `405`: known path, wrong method; include `Allow`;
- `413`: body too large;
- `415`: wrong content type;
- `503`: queue/log full, subscriber failed, or shutting down;
- `500`: log I/O/corruption discovered during the request.

No stack traces or absolute host paths appear in HTTP or normal CLI errors.

## CLI failures and exits

Diagnostics go to stderr and successful data goes to stdout.

| Exit | Meaning |
| --- | --- |
| `0` | command completed with no invalid ingest records |
| `2` | CLI usage/configuration error |
| `3` | one or more input events were invalid |
| `4` | file/log I/O or corrupt/unsupported log |
| `5` | queue/subscriber/service failure |
| `130` | cancellation before orderly completion |

Fatal CLI errors always use one JSON line on stderr:

```json
{"error":{"code":"log_corrupt","message":"...","details":{}}}
```

Required stable codes include `invalid_event`, `invalid_json`, `body_too_large`,
`invalid_query`, `log_corrupt`, `unsupported_log_version`, `log_full`,
`log_io`, `subscriber_failed`, and `cancelled`.

## Five guided milestones

### Milestone 1 — portable event domain

Implement the union types, pure `unknown` parser, normalization, replay
filtering, typed errors, and an in-memory log.

Acceptance:

- no assertion/cast bypasses validation of external values;
- exhaustive switches are checked with `never`;
- every field boundary and both variants have contract cases;
- sequence/filter ordering is deterministic;
- portable `m1-domain` contracts pass under Node, Deno, and Bun.

### Milestone 2 — portable async boundary

Implement async iterable ingestion, bounded FIFO delivery, subscribers,
`AbortSignal`, and runtime-neutral CLI parsing/command execution.

Acceptance:

- the core contains no runtime globals/imports;
- a deferred fake proves producers wait at capacity and events are not dropped;
- subscriber failure and cancellation close iterators cleanly;
- stdout/stderr records and exit categories match the contract;
- `m2-async` contracts pass in all runtimes.

### Milestone 3 — runtime file/process adapters

Implement stdin/file sources and versioned append-log adapters for Node, Deno,
and Bun.

Acceptance:

- each adapter passes the same create/append/reopen/replay/corruption contract;
- handles close after success, error, and abort;
- a partial final line and non-contiguous sequence fail closed;
- the starter still format-checks/type-checks with explicit TODO failures;
- runtime-native `m3-adapter` suites pass.

### Milestone 4 — HTTP relay

Implement the three tiny servers, bounded bodies, query validation, service
lifecycle, and graceful shutdown.

Acceptance:

- framework-neutral HTTP scenarios have identical semantic results;
- wrong methods, media types, oversized bodies, and shutdown races are covered;
- loopback-only tests leave no listening sockets or unfinished promises;
- Deno tests prove insufficient permissions fail rather than being widened;
- runtime-native `m4-http` suites pass.

### Milestone 5 — conformance and distribution

Complete shared fixtures, subprocess CLIs, runtime conformance, build/compile
smokes, audits, coverage, and documentation.

Acceptance:

- the same fixture manifest produces equivalent normalized output in all three
  runtimes;
- Node 24/26, Deno 2.9.3, and Bun 1.3.14 gates pass;
- Node and Bun build smokes and Deno compile/documentation checks cover the
  capstone entry points;
- no test uses public network, arbitrary user files, or timing thresholds;
- all repository quality commands pass.

## Starter, solution, and test architecture

```text
capstones/idiomatic/
├── SPEC.md
├── starter/
│   ├── core/
│   ├── node/
│   ├── deno/
│   └── bun/
├── solution/
│   ├── core/
│   ├── node/
│   ├── deno/
│   └── bun/
└── tests/
    ├── contracts/
    ├── fixtures/
    ├── node/
    ├── deno/
    └── bun/
```

Starter and solution expose identical module paths and exports. The starter has
complete types, parsers' signatures, capability interfaces, CLI options, and
explicit scoped TODO errors. A framework-free contract module receives
factories and is wrapped by `node:test`, `Deno.test`, and `bun:test`. Node is
the primary whole-tree typecheck; Deno/Bun own their adapter checks. Later
tooling changes must include the new trees without weakening current gates.

## Deterministic fixtures and seams

Required fixtures:

- `events-valid.jsonl`, `events-mixed.jsonl`;
- a semantic expected ingest stream and replay result;
- corrupt logs for bad header, partial JSON, invalid event, and sequence gap;
- HTTP request/response cases independent of server implementation.

Required capabilities are an async event source, event log, subscriber,
runtime file/process/server adapter, and optional ID-free logger. Tests use fake
async iterables, deferred promises, controlled `AbortController`, in-memory
logs, repository-local test-data or runtime temporary directories, and
loopback servers. No correctness test depends on sleeps, wall time, random IDs,
DNS, or external services.

## Dependencies and runtime scope

The capstone requires no runtime or development dependency beyond the
repository's existing pins.

Exact existing pins retained:

- TypeScript `5.9.3`, `tsx` `4.23.1`, ESLint `9.39.2`, Prettier `3.7.4`,
  `typescript-eslint` `8.48.0`;
- `@types/node` `24.10.0`, `@types/bun` `1.3.14`;
- Deno `2.9.3`, Bun `1.3.14`, `@std/path` `1.1.6`;
- Node runtime matrix `24.x` and `26.x`.

The repository has no runtime dependencies. Multi-process locking packages are
out of scope because the relay specifies one writer. Also rejected:
web frameworks, schema validators, database clients, broker SDKs, stream helper
libraries, retry packages, and test assertion libraries.

Required behavior is supported by the Linux CI matrix. Portable core and
runtime adapters must avoid POSIX-only assumptions so hosted Windows/macOS can
be added without changing the contract. Deno commands use least permissions;
Node/Bun do not inspect paths outside explicit CLI inputs.

## Exclusions

No WebSockets, message broker, authentication, TLS setup, distributed delivery,
exactly-once claims, consumer offsets, database, schema registry, plugins,
workers, cross-process locking, retries, log compaction, file watching, cloud
deployment, or production observability stack is required.

## Quality and coverage commands

Track commands the harness must support:

```bash
CAPSTONE_IMPLEMENTATION=solution npm run test:capstone:idiomatic:node
CAPSTONE_IMPLEMENTATION=solution npm run test:capstone:idiomatic:deno
CAPSTONE_IMPLEMENTATION=solution npm run test:capstone:idiomatic:bun
```

Final validation extends, rather than replaces, the repository commands:

```bash
npm run format:check
npm run lint
npm run typecheck:node
npm run test:node
npm run coverage
npm run portability
deno task check
npm run check:bun
npm run audit:node
```

The comparative capstone and idiomatic portable core enforce at least 85% lines,
85% functions, and 80% branches through `npm run coverage`.

## Migration and reuse guidance

Reuse/refactor:

- runtime-neutral core and CLI-command separation patterns from the
  [historical Task core][legacy-task-core];
- strict `unknown` parsing, shared contract factories, and semantic conformance;
- Node/Deno/Bun process, file, test, server lifecycle, permission, build, and
  compile patterns from the current runtime adapters;
- `AbortSignal`, loopback, temporary-data, and graceful-shutdown test support.

Do not copy Task lifecycle/domain/storage interfaces. Node locking is only a
reference for documenting the deliberate one-writer limitation. Task documents,
comparative key/value databases, and relay event logs are intentionally
incompatible. Follow the
[old-to-new migration guide](../../docs/PROJECT_MIGRATION.md) for ownership,
reuse, validation, and the completed dependency cleanup.

[legacy-project]: https://github.com/mbrndiar/learning-typescript/tree/74dfe53d5240c53a0596a35299ae8cfd9a55d51e/project
[legacy-task-core]: https://github.com/mbrndiar/learning-typescript/tree/74dfe53d5240c53a0596a35299ae8cfd9a55d51e/project/task-core
