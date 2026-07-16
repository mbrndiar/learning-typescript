# 📡 Idiomatic capstone: cross-runtime event relay

[`SPEC.md`](SPEC.md) is the normative contract. The completed solution keeps
validation, replay, bounded delivery, CLI behavior, and HTTP semantics in a
runtime-neutral core. Thin Node.js, Deno, and Bun adapters own process signals,
files, stdin, and loopback server APIs.

## Features

- strict `unknown` narrowing for metric and alert events;
- RFC 3339-to-UTC normalization without Unicode normalization;
- bounded FIFO delivery with producer backpressure and subscriber acknowledgement;
- version-1, single-writer JSON Lines logs with fail-closed replay;
- NDJSON ingest that continues after invalid records;
- filtered replay and a 64 KiB-bounded loopback HTTP API;
- graceful cancellation and deterministic resource cleanup.

The guided `starter/` exports the same public boundary and uses explicit
`TODO(m1-domain)` through `TODO(m4-http)` failures. The complete implementation
lives in `solution/`. Neither core imports runtime-specific modules or globals.

## Run the relay

```bash
npx tsx capstones/idiomatic/solution/node/main.ts \
  ingest --log .relay-data/events.jsonl \
  --input capstones/idiomatic/tests/fixtures/events-valid.jsonl

deno run \
  --allow-read=.relay-data,capstones/idiomatic/tests/fixtures/events-valid.jsonl \
  --allow-write=.relay-data \
  capstones/idiomatic/solution/deno/main.ts \
  ingest --log .relay-data/events.jsonl \
  --input capstones/idiomatic/tests/fixtures/events-valid.jsonl

bun run capstones/idiomatic/solution/bun/main.ts \
  replay --log .relay-data/events.jsonl
```

`serve` defaults to `127.0.0.1:8080` and provides `GET /healthz`,
`POST /v1/events`, and filtered `GET /v1/events`.

The Deno file adapter must be able to create the log directory and file. Grant
`.relay-data` for read/write rather than only the final file. Ingesting from
stdin needs no extra read path; ingesting from a file needs that input path too.
Serving additionally needs only the selected loopback listener:

```bash
deno run --allow-read=.relay-data --allow-write=.relay-data \
  --allow-net=127.0.0.1:8080 \
  capstones/idiomatic/solution/deno/main.ts \
  serve --log .relay-data/events.jsonl
```

## Five milestone groups

Framework-free contracts in `tests/contracts/` are wrapped by each runtime:

1. `m1-domain` — validation, normalization, capacity, sequence, and replay;
2. `m2-async` — NDJSON, bounded queue, ordering, failure, and cancellation;
3. `m3-adapter` — create/reopen/replay and corrupt-log rejection;
4. `m4-http` — loopback requests, limits, status mapping, and cleanup;
5. `m5-conformance` — shared fixtures and equivalent observable semantics.

```bash
CAPSTONE_IMPLEMENTATION=solution npm run test:capstone:idiomatic:node
CAPSTONE_IMPLEMENTATION=solution npm run test:capstone:idiomatic:deno
CAPSTONE_IMPLEMENTATION=solution npm run test:capstone:idiomatic:bun
npm run coverage:idiomatic
npm run portability
```

`coverage:idiomatic` measures the portable solution core and enforces at least
85% lines, 85% functions, and 80% branches.
