import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { selectedComparativeImplementation } from "./implementation.ts";

const SPEC_VERSION = "1.0.0";
const MAX_SAFE_REVISION = 9_007_199_254_740_991;
const MAX_VALUE_BYTES = 65_536;
const MAX_CONTAINER_DEPTH = 32;
const BUSY_TIMEOUT_MS = 10_000;
const keyPattern = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/u;
const PROCESS_TIMEOUT_MS = 15_000;
const PARALLEL_TIMEOUT_MS = 30_000;
const SCRATCH_ROOT = fileURLToPath(new URL("../../.test-data/", import.meta.url));
const SPEC_ROOT = fileURLToPath(new URL("../../spec/", import.meta.url));
const ACTOR_ENTRY = fileURLToPath(new URL("./actor.ts", import.meta.url));
const LOCK_HELPER_ENTRY = fileURLToPath(new URL("./lock-helper.ts", import.meta.url));
const PROJECT_ROOT = fileURLToPath(new URL("../../../..", import.meta.url));

type RecordValue = Record<string, unknown>;

interface ScenarioPaths {
  readonly directory: string;
  readonly database: string;
  readonly missingParent: string;
}

interface ProcessHandle {
  readonly child: ChildProcess;
  readonly completion: Promise<{
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }>;
  readonly arguments: readonly string[];
  readonly stdout: Buffer[];
  readonly stderr: Buffer[];
  readonly startedAt: number;
}

interface RunResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly envelope: RecordValue;
  readonly durationMs: number;
  readonly arguments: readonly string[];
}

interface ActorResult {
  readonly arguments: readonly string[];
  readonly result: RunResult;
}

interface LockHandle {
  readonly process: ProcessHandle;
  readonly readyPath: string;
  readonly releasePath: string;
}

export async function assertFrozenFixtureIntegrity(): Promise<void> {
  await assertSpecVersions();
  await assertFrozenManifest();
  const contract = await fixture("fixtures/contract.json");
  assertAllowedKeys(contract, [
    "kind",
    "spec_id",
    "spec_version",
    "key_pattern",
    "key_max_bytes",
    "safe_integer_min",
    "safe_integer_max",
    "value_input_max_utf8_bytes",
    "max_container_depth",
    "busy_timeout_ms",
    "commands",
    "set_expectations",
    "delete_expectations",
    "exit_codes",
  ]);
  assert.equal(field(contract, "spec_id"), "comparative-kv");
  assert.equal(field(contract, "safe_integer_max"), MAX_SAFE_REVISION);
  assert.equal(field(contract, "safe_integer_min"), -MAX_SAFE_REVISION);
  assert.equal(field(contract, "value_input_max_utf8_bytes"), MAX_VALUE_BYTES);
  assert.equal(field(contract, "max_container_depth"), MAX_CONTAINER_DEPTH);
  assert.equal(field(contract, "busy_timeout_ms"), BUSY_TIMEOUT_MS);
  assert.equal(field(contract, "key_pattern"), "[A-Za-z0-9][A-Za-z0-9._/-]{0,127}");
  assert.deepEqual(field(contract, "commands"), ["set", "get", "delete", "list"]);
  assert.deepEqual(field(contract, "set_expectations"), [
    "any",
    "absent",
    "exact_revision",
  ]);
  assert.deepEqual(field(contract, "delete_expectations"), ["any", "exact_revision"]);
  assert.deepEqual(field(contract, "exit_codes"), {
    success: 0,
    validation: 2,
    conflict: 3,
    not_found: 4,
    storage: 5,
  });

  const keys = await fixture("fixtures/keys.json");
  assertAllowedKeys(keys, ["kind", "spec_version", "accepted", "rejected", "ordering"]);
  for (const case_ of records(field(keys, "accepted"))) {
    assertAllowedKeys(case_, ["id", "key", "key_generator"]);
    assert.match(generatedKey(case_), keyPattern);
  }
  for (const case_ of records(field(keys, "rejected"))) {
    assertAllowedKeys(case_, ["id", "key", "key_generator"]);
    assert.doesNotMatch(generatedKey(case_), keyPattern);
  }

  const accepted = await fixture("fixtures/values-accepted.json");
  assertAllowedKeys(accepted, ["kind", "spec_version", "cases"]);
  for (const case_ of records(field(accepted, "cases"))) {
    assertAllowedKeys(case_, [
      "id",
      "input_json",
      "input_generator",
      "normalized",
      "normalized_generator",
    ]);
    assert.doesNotThrow(() => JSON.parse(generatedInput(case_)));
    assert.notEqual(generatedNormalized(case_), undefined, string(field(case_, "id")));
  }

  const rejected = await fixture("fixtures/values-rejected.json");
  assertAllowedKeys(rejected, ["kind", "spec_version", "cases"]);
  for (const case_ of records(field(rejected, "cases"))) {
    assertAllowedKeys(case_, [
      "id",
      "input_json",
      "input_generator",
      "exit",
      "category",
      "details",
    ]);
    assert.equal(integer(field(case_, "exit")) >= 2, true);
    assert.notEqual(string(field(case_, "category")), "");
    record(field(case_, "details"));
  }
}

export async function runDomainCliFixtures(): Promise<void> {
  await runKeyFixture();
  await runAcceptedValueFixture();
  await runRejectedValueFixture();
}

export async function runSequentialFixture(relativePath: string): Promise<void> {
  const document = await fixture(`fixtures/${relativePath}`);
  assertAllowedKeys(document, ["kind", "spec_version", "scenarios"]);
  assert.equal(field(document, "kind"), "sequential_scenarios");
  for (const scenario of records(field(document, "scenarios"))) {
    assertAllowedKeys(scenario, ["id", "database", "setup", "steps"]);
    await runSequentialScenario(scenario);
  }
}

export async function assertAdditionalCliGrammar(): Promise<void> {
  const paths = await scenarioPaths("exact-cli");
  const database = join(paths.directory, "store=with-equals.db");
  const invalidArguments = [
    [`--db=${database}`, "list"],
    ["--db", database, "list", "extra"],
    ["--db", database, "set", "key", "--value-json=1"],
    ["--db", database, "set", "key", "--value-json", "1", "--expect=any"],
  ];
  try {
    for (const arguments_ of invalidArguments) {
      const result = await runCli(arguments_, paths.directory);
      assertStandard(result, 2, {
        ok: false,
        error: { category: "usage", details: { reason: "invalid_cli" } },
      });
      assert.equal(await exists(database), false);
    }
    const valid = await runCli(
      ["--db", database, "set", "equals", "--value-json", '"a=b"'],
      paths.directory,
    );
    assert.equal(valid.exitCode, 0);
    assert.equal(field(record(field(valid.envelope, "result")), "value"), "a=b");

    const unusualParent = join(paths.directory, "directory with spaces");
    await mkdir(unusualParent);
    const unusualDatabase = join(unusualParent, "-store.db");
    const unusual = await runCli(["--db", unusualDatabase, "list"], paths.directory);
    assertStandard(unusual, 0, {
      ok: true,
      result: { entries: [], global_revision: 0 },
    });
    await cleanupDatabaseFiles(unusualDatabase);
  } finally {
    await cleanup(paths, database);
  }
}

export async function assertV1StorageInvariants(): Promise<void> {
  const cases: ReadonlyArray<{
    readonly id: string;
    readonly statements: readonly string[];
    readonly details: RecordValue;
  }> = [
    {
      id: "invalid-key",
      statements: [
        "INSERT INTO store_metadata(singleton, schema_version, global_revision) VALUES (1, 1, 1)",
        "INSERT INTO entries(key, value_json, revision) VALUES ('-bad', 'null', 1)",
      ],
      details: { reason: "invalid_key", key: "-bad" },
    },
    {
      id: "invalid-value",
      statements: [
        "INSERT INTO store_metadata(singleton, schema_version, global_revision) VALUES (1, 1, 1)",
        "INSERT INTO entries(key, value_json, revision) VALUES ('good', '1.5', 1)",
      ],
      details: { reason: "invalid_value", key: "good" },
    },
    {
      id: "unnormalized-value",
      statements: [
        "INSERT INTO store_metadata(singleton, schema_version, global_revision) VALUES (1, 1, 1)",
        "INSERT INTO entries(key, value_json, revision) VALUES ('good', '1.0', 1)",
      ],
      details: { reason: "invalid_value", key: "good" },
    },
    {
      id: "duplicate-revision",
      statements: [
        "INSERT INTO store_metadata(singleton, schema_version, global_revision) VALUES (1, 1, 1)",
        "INSERT INTO entries(key, value_json, revision) VALUES ('a', 'null', 1)",
        "INSERT INTO entries(key, value_json, revision) VALUES ('b', 'true', 1)",
      ],
      details: { reason: "revision_invariant" },
    },
    {
      id: "revision-ahead",
      statements: [
        "INSERT INTO store_metadata(singleton, schema_version, global_revision) VALUES (1, 1, 1)",
        "INSERT INTO entries(key, value_json, revision) VALUES ('a', 'null', 2)",
      ],
      details: { reason: "revision_invariant" },
    },
  ];

  for (const case_ of cases) {
    const paths = await scenarioPaths(case_.id);
    try {
      setupV1(paths.database, case_.statements);
      const result = await runCli(["--db", paths.database, "list"], paths.directory);
      assertStandard(result, 5, {
        ok: false,
        error: { category: "invalid_storage", details: case_.details },
      });
      assertIntegrity(paths.database);
    } finally {
      await cleanup(paths);
    }
  }

  const paths = await scenarioPaths("nondefault-pragmas");
  try {
    setupV1(paths.database, [
      "PRAGMA user_version = 7",
      "INSERT INTO store_metadata(singleton, schema_version, global_revision) VALUES (1, 1, 0)",
    ]);
    const result = await runCli(["--db", paths.database, "list"], paths.directory);
    assertStandard(result, 5, {
      ok: false,
      error: {
        category: "invalid_storage",
        details: { reason: "malformed_schema" },
      },
    });
  } finally {
    await cleanup(paths);
  }
}

export async function runMultiprocessFixture(): Promise<void> {
  const document = await fixture("fixtures/scenarios/multiprocess.json");
  assertAllowedKeys(document, ["kind", "spec_version", "scenarios"]);
  assert.equal(field(document, "kind"), "multiprocess_scenarios");
  for (const scenario of records(field(document, "scenarios"))) {
    assertAllowedKeys(scenario, ["id", "repeat", "database", "setup", "operations"]);
    for (
      let repetition = 0;
      repetition < integer(field(scenario, "repeat"));
      repetition += 1
    ) {
      await runMultiprocessScenario(scenario, repetition);
    }
  }
}

async function runSequentialScenario(scenario: RecordValue): Promise<void> {
  const paths = await scenarioPaths(string(field(scenario, "id")));
  try {
    const databaseKind = string(field(scenario, "database"));
    if (databaseKind === "sqlite_setup") {
      sqliteSetup(paths.database, record(field(scenario, "setup")));
    } else {
      assert.equal(databaseKind, "fresh");
    }

    for (const stepValue of records(field(scenario, "steps"))) {
      const kinds = Object.keys(stepValue);
      if ("run" in stepValue) {
        assertAllowedKeys(stepValue, ["run", "expect"]);
        const run = record(stepValue.run);
        assertAllowedKeys(run, ["args"]);
        const result = await runCli(
          substituteArguments(field(run, "args"), paths),
          paths.directory,
        );
        assertExpectation(result, record(field(stepValue, "expect")));
      } else if ("sqlite_assert" in stepValue) {
        assertAllowedKeys(stepValue, ["sqlite_assert"]);
        sqliteAssertions(paths.database, record(stepValue.sqlite_assert));
      } else if ("fixture_references" in stepValue) {
        assertAllowedKeys(stepValue, ["fixture_references"]);
        for (const reference of strings(stepValue.fixture_references)) {
          await runFixtureReference(reference);
        }
      } else {
        assert.fail(`unknown sequential step: ${kinds.join(",")}`);
      }
    }
    if (await exists(paths.database)) {
      assertIntegrity(paths.database);
    }
  } finally {
    await cleanup(paths);
  }
}

async function runFixtureReference(reference: string): Promise<void> {
  switch (reference) {
    case "../keys.json":
      await runKeyFixture();
      break;
    case "../values-accepted.json":
      await runAcceptedValueFixture();
      break;
    case "../values-rejected.json":
      await runRejectedValueFixture();
      break;
    default:
      assert.fail(`unknown fixture reference ${reference}`);
  }
}

async function runKeyFixture(): Promise<void> {
  const document = await fixture("fixtures/keys.json");
  for (const case_ of records(field(document, "accepted"))) {
    const paths = await scenarioPaths(`key-${string(field(case_, "id"))}`);
    try {
      const key = generatedKey(case_);
      const set = await runCli(
        [
          "--db",
          paths.database,
          "set",
          key,
          "--value-json",
          "null",
          "--expect",
          "absent",
        ],
        paths.directory,
      );
      assert.equal(set.exitCode, 0);
      const get = await runCli(["--db", paths.database, "get", key], paths.directory);
      assert.equal(get.exitCode, 0);
      assert.equal(field(record(field(get.envelope, "result")), "key"), key);
      assertIntegrity(paths.database);
    } finally {
      await cleanup(paths);
    }
  }

  for (const case_ of records(field(document, "rejected"))) {
    const paths = await scenarioPaths(`key-${string(field(case_, "id"))}`);
    try {
      const result = await runCli(
        ["--db", paths.database, "get", generatedKey(case_)],
        paths.directory,
      );
      assertStandard(result, 2, {
        ok: false,
        error: {
          category: "invalid_argument",
          details: { field: "key", reason: "format" },
        },
      });
      assert.equal(await exists(paths.database), false);
    } finally {
      await cleanup(paths);
    }
  }

  const paths = await scenarioPaths("key-ordering");
  try {
    const ordering = strings(field(document, "ordering"));
    for (const key of [...ordering].reverse()) {
      const result = await runCli(
        ["--db", paths.database, "set", key, "--value-json", "null"],
        paths.directory,
      );
      assert.equal(result.exitCode, 0);
    }
    const listed = await runCli(["--db", paths.database, "list"], paths.directory);
    const entries = records(field(record(field(listed.envelope, "result")), "entries"));
    assert.deepEqual(
      entries.map((entry) => field(entry, "key")),
      ordering,
    );
    assertIntegrity(paths.database);
  } finally {
    await cleanup(paths);
  }
}

async function runAcceptedValueFixture(): Promise<void> {
  const document = await fixture("fixtures/values-accepted.json");
  for (const case_ of records(field(document, "cases"))) {
    assertAllowedKeys(case_, [
      "id",
      "input_json",
      "input_generator",
      "normalized",
      "normalized_generator",
    ]);
    const paths = await scenarioPaths(`accepted-${string(field(case_, "id"))}`);
    try {
      const expected = generatedNormalized(case_);
      const set = await runCli(
        [
          "--db",
          paths.database,
          "set",
          "value",
          "--value-json",
          generatedInput(case_),
          "--expect",
          "absent",
        ],
        paths.directory,
      );
      assert.equal(set.exitCode, 0);
      const result = record(field(set.envelope, "result"));
      assert.equal(field(result, "created"), true);
      assert.equal(field(result, "revision"), 1);
      assert.deepEqual(field(result, "value"), expected);
      const get = await runCli(
        ["--db", paths.database, "get", "value"],
        paths.directory,
      );
      assert.deepEqual(field(record(field(get.envelope, "result")), "value"), expected);
      assertIntegrity(paths.database);
    } finally {
      await cleanup(paths);
    }
  }
}

async function runRejectedValueFixture(): Promise<void> {
  const document = await fixture("fixtures/values-rejected.json");
  for (const case_ of records(field(document, "cases"))) {
    assertAllowedKeys(case_, [
      "id",
      "input_json",
      "input_generator",
      "exit",
      "category",
      "details",
    ]);
    const paths = await scenarioPaths(`rejected-${string(field(case_, "id"))}`);
    try {
      const result = await runCli(
        ["--db", paths.database, "set", "value", "--value-json", generatedInput(case_)],
        paths.directory,
      );
      assertStandard(result, integer(field(case_, "exit")), {
        ok: false,
        error: {
          category: string(field(case_, "category")),
          details: field(case_, "details"),
        },
      });
      assert.equal(await exists(paths.database), false);
    } finally {
      await cleanup(paths);
    }
  }
}

async function runMultiprocessScenario(
  scenario: RecordValue,
  repetition: number,
): Promise<void> {
  const id = `${string(field(scenario, "id"))}-${repetition}`;
  const paths = await scenarioPaths(id);
  const captures = new Map<string, unknown>();
  const running = new Map<string, ProcessHandle>();
  const locks = new Map<string, LockHandle>();
  try {
    const databaseKind = string(field(scenario, "database"));
    if (databaseKind === "sqlite_setup") {
      sqliteSetup(paths.database, record(field(scenario, "setup")));
    } else {
      assert.equal(databaseKind, "fresh");
    }

    for (const operation of records(field(scenario, "operations"))) {
      assert.equal(Object.keys(operation).length, 1);
      if ("parallel" in operation) {
        await runParallelGroup(paths, record(operation.parallel));
      } else if ("run_assert" in operation) {
        const definition = record(operation.run_assert);
        assertAllowedKeys(definition, ["args", "expect", "assert", "capture"]);
        const result = await runCli(
          substituteArguments(field(definition, "args"), paths),
          paths.directory,
        );
        assertExpectation(result, record(field(definition, "expect")));
        if ("assert" in definition) {
          assertStructural(result, record(definition.assert), captures);
        }
        if ("capture" in definition) {
          captures.set(string(definition.capture), field(result.envelope, "result"));
        }
      } else if ("start_lock_helper" in operation) {
        const definition = record(operation.start_lock_helper);
        assertAllowedKeys(definition, ["id"]);
        const lockId = string(field(definition, "id"));
        assert.equal(locks.has(lockId), false);
        locks.set(lockId, await startLockHelper(paths, lockId));
      } else if ("start_cli" in operation) {
        const definition = record(operation.start_cli);
        assertAllowedKeys(definition, ["id", "args"]);
        const cliId = string(field(definition, "id"));
        assert.equal(running.has(cliId), false);
        running.set(
          cliId,
          startProcess(
            selectedEntry(),
            substituteArguments(field(definition, "args"), paths),
          ),
        );
      } else if ("sleep_ms" in operation) {
        await delay(integer(operation.sleep_ms));
      } else if ("release_lock_helper" in operation) {
        const definition = record(operation.release_lock_helper);
        assertAllowedKeys(definition, ["id"]);
        const lockId = string(field(definition, "id"));
        const lock = locks.get(lockId);
        if (lock === undefined) {
          assert.fail(`unknown lock helper ${lockId}`);
        }
        locks.delete(lockId);
        await releaseLockHelper(lock);
      } else if ("await_cli" in operation) {
        const definition = record(operation.await_cli);
        assertAllowedKeys(definition, ["id", "expect", "assert"]);
        const cliId = string(field(definition, "id"));
        const handle = running.get(cliId);
        if (handle === undefined) {
          assert.fail(`unknown CLI ${cliId}`);
        }
        running.delete(cliId);
        const result = await finishCli(handle, 20_000);
        assertExpectation(result, record(field(definition, "expect")));
        if ("assert" in definition) {
          assertDuration(result, record(definition.assert));
        }
      } else {
        assert.fail(
          `unknown multiprocess operation ${Object.keys(operation).join(",")}`,
        );
      }
    }
    assert.equal(running.size, 0, "all started CLIs must be awaited");
    assert.equal(locks.size, 0, "all lock helpers must be released");
    if (await exists(paths.database)) {
      assertIntegrity(paths.database);
    }
  } finally {
    for (const handle of running.values()) {
      await terminate(handle);
    }
    for (const lock of locks.values()) {
      await writeFile(lock.releasePath, "release").catch(() => undefined);
      await finishRaw(lock.process, 30_000).catch(async () => terminate(lock.process));
    }
    await cleanup(paths);
  }
}

async function runParallelGroup(
  paths: ScenarioPaths,
  parallel: RecordValue,
): Promise<void> {
  assertAllowedKeys(parallel, ["actors_generator", "assert"]);
  const generator = record(field(parallel, "actors_generator"));
  assertAllowedKeys(generator, ["kind", "count", "pad_width", "args"]);
  assert.equal(field(generator, "kind"), "indexed_commands");
  const count = integer(field(generator, "count"));
  const padWidth = "pad_width" in generator ? integer(generator.pad_width) : 0;
  const groupId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const releasePath = join(paths.directory, `parallel-${groupId}.release`);
  const actors: Array<{
    readonly handle: ProcessHandle;
    readonly readyPath: string;
    readonly arguments: readonly string[];
  }> = [];

  try {
    for (let index = 0; index < count; index += 1) {
      const arguments_ = substituteArguments(field(generator, "args"), paths, {
        i: String(index),
        n: String(index + 1),
        padded_n: String(index + 1).padStart(padWidth, "0"),
      });
      const readyPath = join(paths.directory, `parallel-${groupId}-${index}.ready`);
      const handle = startProcess(ACTOR_ENTRY, [], {
        KV_ACTOR_READY: readyPath,
        KV_ACTOR_RELEASE: releasePath,
        KV_ACTOR_ENTRY: selectedEntry(),
        KV_ACTOR_ARGS: JSON.stringify(arguments_),
      });
      actors.push({ handle, readyPath, arguments: arguments_ });
    }
    await Promise.all(
      actors.map((actor) => waitForFile(actor.readyPath, actor.handle, 15_000)),
    );
    await writeFile(releasePath, "release");
    const results: ActorResult[] = [];
    for (const actor of actors) {
      const result = await finishCli(
        actor.handle,
        PARALLEL_TIMEOUT_MS,
        actor.arguments,
      );
      results.push({ arguments: actor.arguments, result });
    }
    await assertParallel(paths, results, record(field(parallel, "assert")));
  } finally {
    for (const actor of actors) {
      if (actor.handle.child.exitCode === null) {
        await terminate(actor.handle);
      }
      await rm(actor.readyPath, { force: true });
    }
    await rm(releasePath, { force: true });
  }
}

async function assertParallel(
  paths: ScenarioPaths,
  actors: readonly ActorResult[],
  assertions: RecordValue,
): Promise<void> {
  assertAllowedKeys(assertions, [
    "all_exit",
    "all_ok",
    "stdout_semantic_all",
    "success_count",
    "category_counts",
    "result_revision_set",
    "success_revision",
    "conflict_actual",
    "not_found_count",
    "winner_value_matches_final",
    "duration_less_than_ms",
    "duration_at_least_ms",
  ]);
  actors.forEach((actor) => assert.equal(actor.result.stderr, ""));
  if ("all_exit" in assertions) {
    actors.forEach((actor) =>
      assert.equal(
        actor.result.exitCode,
        integer(assertions.all_exit),
        JSON.stringify({
          arguments: actor.arguments,
          envelope: actor.result.envelope,
          durationMs: actor.result.durationMs,
        }),
      ),
    );
  }
  if ("all_ok" in assertions) {
    actors.forEach((actor) =>
      assert.equal(field(actor.result.envelope, "ok"), assertions.all_ok),
    );
  }
  if ("stdout_semantic_all" in assertions) {
    actors.forEach((actor) =>
      assert.deepEqual(actor.result.envelope, assertions.stdout_semantic_all),
    );
  }

  const successes = actors.filter(
    (actor) => field(actor.result.envelope, "ok") === true,
  );
  if ("success_count" in assertions) {
    assert.equal(successes.length, integer(assertions.success_count));
  }
  if ("category_counts" in assertions) {
    const counts = new Map<string, number>();
    for (const actor of actors.filter(
      (candidate) => field(candidate.result.envelope, "ok") === false,
    )) {
      const category = errorCategory(actor.result.envelope);
      if (category === undefined) {
        assert.fail("failed actor did not return an error category");
      }
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    const expected = record(assertions.category_counts);
    assert.equal(counts.size, Object.keys(expected).length);
    for (const [category, count] of Object.entries(expected)) {
      assert.equal(counts.get(category) ?? 0, integer(count));
    }
  }
  if ("result_revision_set" in assertions) {
    assertIntegerRange(
      successes.map((actor) =>
        integer(field(record(field(actor.result.envelope, "result")), "revision")),
      ),
      record(assertions.result_revision_set),
    );
  }
  if ("success_revision" in assertions) {
    successes.forEach((actor) =>
      assert.equal(
        field(record(field(actor.result.envelope, "result")), "revision"),
        assertions.success_revision,
      ),
    );
  }
  if ("conflict_actual" in assertions) {
    actors
      .filter((actor) => errorCategory(actor.result.envelope) === "conflict")
      .forEach((actor) =>
        assert.equal(
          field(
            record(field(record(field(actor.result.envelope, "error")), "details")),
            "actual",
          ),
          assertions.conflict_actual,
        ),
      );
  }
  if ("not_found_count" in assertions) {
    assert.equal(
      actors.filter((actor) => errorCategory(actor.result.envelope) === "not_found")
        .length,
      integer(assertions.not_found_count),
    );
  }
  if (assertions.winner_value_matches_final === true) {
    assert.equal(successes.length, 1);
    const winner = successes[0];
    if (winner === undefined) {
      assert.fail("winner was not captured");
    }
    const setIndex = winner.arguments.indexOf("set");
    assert.notEqual(setIndex, -1);
    const key = winner.arguments[setIndex + 1];
    if (key === undefined) {
      assert.fail("winner key was not captured");
    }
    const final = await runCli(["--db", paths.database, "get", key], paths.directory);
    assert.deepEqual(
      field(record(field(final.envelope, "result")), "value"),
      field(record(field(winner.result.envelope, "result")), "value"),
    );
  }
  actors.forEach((actor) => assertDuration(actor.result, assertions));
}

function assertStructural(
  run: RunResult,
  assertions: RecordValue,
  captures: ReadonlyMap<string, unknown>,
): void {
  assertAllowedKeys(assertions, [
    "keys_in_order",
    "global_revision",
    "entry_count",
    "entry_revision_set",
    "values_by_key",
    "revision_by_key",
    "state_unchanged_from",
    "duration_less_than_ms",
    "duration_at_least_ms",
  ]);
  const result = record(field(run.envelope, "result"));
  const entries = "entries" in result ? records(result.entries) : undefined;
  if ("keys_in_order" in assertions) {
    if (entries === undefined) {
      assert.fail("keys assertion requires entries");
    }
    assert.deepEqual(
      entries.map((entry) => field(entry, "key")),
      assertions.keys_in_order,
    );
  }
  if ("global_revision" in assertions) {
    assert.equal(field(result, "global_revision"), assertions.global_revision);
  }
  if ("entry_count" in assertions) {
    assert.equal(entries?.length, integer(assertions.entry_count));
  }
  if ("entry_revision_set" in assertions) {
    if (entries === undefined) {
      assert.fail("revision assertion requires entries");
    }
    assertIntegerRange(
      entries.map((entry) => integer(field(entry, "revision"))),
      record(assertions.entry_revision_set),
    );
  }
  if ("values_by_key" in assertions) {
    if (entries === undefined) {
      assert.fail("value assertion requires entries");
    }
    const byKey = entriesByKey(entries);
    for (const [key, value] of Object.entries(record(assertions.values_by_key))) {
      assert.deepEqual(field(requiredEntry(byKey, key), "value"), value);
    }
  }
  if ("revision_by_key" in assertions) {
    if (entries === undefined) {
      assert.fail("revision assertion requires entries");
    }
    const byKey = entriesByKey(entries);
    for (const [key, revision] of Object.entries(record(assertions.revision_by_key))) {
      assert.equal(field(requiredEntry(byKey, key), "revision"), revision);
    }
  }
  if ("state_unchanged_from" in assertions) {
    const capture = string(assertions.state_unchanged_from);
    assert.equal(captures.has(capture), true);
    assert.deepEqual(result, captures.get(capture));
  }
  assertDuration(run, assertions);
}

function entriesByKey(entries: readonly RecordValue[]): Map<string, RecordValue> {
  return new Map(entries.map((entry) => [string(field(entry, "key")), entry]));
}

function requiredEntry(
  entries: ReadonlyMap<string, RecordValue>,
  key: string,
): RecordValue {
  const entry = entries.get(key);
  if (entry === undefined) {
    assert.fail(`missing entry ${key}`);
  }
  return entry;
}

function assertIntegerRange(actual: readonly number[], range: RecordValue): void {
  assertAllowedKeys(range, ["from", "to"]);
  const expected: number[] = [];
  for (
    let value = integer(field(range, "from"));
    value <= integer(field(range, "to"));
    value += 1
  ) {
    expected.push(value);
  }
  assert.deepEqual(
    [...actual].sort((left, right) => left - right),
    expected,
  );
}

function assertDuration(result: RunResult, assertions: RecordValue): void {
  if ("duration_less_than_ms" in assertions) {
    assert.ok(
      result.durationMs < integer(assertions.duration_less_than_ms),
      `${result.durationMs}ms is not below ${String(assertions.duration_less_than_ms)}ms`,
    );
  }
  if ("duration_at_least_ms" in assertions) {
    assert.ok(
      result.durationMs >= integer(assertions.duration_at_least_ms),
      `${result.durationMs}ms is below ${String(assertions.duration_at_least_ms)}ms`,
    );
  }
}

async function startLockHelper(paths: ScenarioPaths, id: string): Promise<LockHandle> {
  const readyPath = join(paths.directory, `${id}.ready`);
  const releasePath = join(paths.directory, `${id}.release`);
  const process = startProcess(LOCK_HELPER_ENTRY, [
    paths.database,
    readyPath,
    releasePath,
  ]);
  await waitForFile(readyPath, process, PROCESS_TIMEOUT_MS);
  return { process, readyPath, releasePath };
}

async function releaseLockHelper(handle: LockHandle): Promise<void> {
  await writeFile(handle.releasePath, "release");
  const result = await finishRaw(handle.process, PROCESS_TIMEOUT_MS);
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
  await rm(handle.readyPath, { force: true });
  await rm(handle.releasePath, { force: true });
}

function startProcess(
  entry: string,
  arguments_: readonly string[],
  additionalEnvironment: Readonly<Record<string, string>> = {},
): ProcessHandle {
  const child = spawn(process.execPath, ["--import=tsx", entry, ...arguments_], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, ...additionalEnvironment },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  const completion = new Promise<{
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
  child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));
  return {
    child,
    completion,
    arguments: arguments_,
    stdout,
    stderr,
    startedAt: performance.now(),
  };
}

async function runCli(
  arguments_: readonly string[],
  _outputDirectory: string,
  timeoutMs = PROCESS_TIMEOUT_MS,
): Promise<RunResult> {
  return finishCli(startProcess(selectedEntry(), arguments_), timeoutMs);
}

async function finishCli(
  handle: ProcessHandle,
  timeoutMs: number,
  arguments_: readonly string[] = handle.arguments,
): Promise<RunResult> {
  const raw = await finishRaw(handle, timeoutMs);
  const envelope = parseStdout(raw.stdout);
  assertCommandResultShape(arguments_, envelope);
  return { ...raw, envelope, arguments: arguments_ };
}

async function finishRaw(
  handle: ProcessHandle,
  timeoutMs: number,
): Promise<{
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
}> {
  const status = await new Promise<{
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }>((resolve, reject) => {
    const timeout = setTimeout(() => {
      handle.child.kill("SIGKILL");
      void handle.completion.finally(() => {
        reject(
          new Error(`child ${handle.child.pid ?? "unknown"} exceeded ${timeoutMs}ms`),
        );
      });
    }, timeoutMs);
    handle.completion.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
  assert.equal(status.signal, null, `child terminated by ${status.signal ?? "signal"}`);
  const stdout = decodeUtf8(Buffer.concat(handle.stdout), "stdout");
  const stderr = decodeUtf8(Buffer.concat(handle.stderr), "stderr");
  return {
    exitCode: status.code ?? 1,
    stdout,
    stderr,
    durationMs: performance.now() - handle.startedAt,
  };
}

async function terminate(handle: ProcessHandle): Promise<void> {
  if (handle.child.exitCode === null && handle.child.signalCode === null) {
    handle.child.kill("SIGKILL");
  }
  await new Promise<void>((resolve) => {
    if (handle.child.exitCode !== null || handle.child.signalCode !== null) {
      resolve();
    } else {
      handle.child.once("exit", () => resolve());
    }
  });
}

async function waitForFile(
  path: string,
  processHandle: ProcessHandle,
  timeoutMs: number,
): Promise<void> {
  const deadline = performance.now() + timeoutMs;
  while (!(await exists(path))) {
    if (
      processHandle.child.exitCode !== null ||
      processHandle.child.signalCode !== null
    ) {
      const raw = await finishRaw(processHandle, 1);
      assert.fail(
        `helper exited before ${path}: ${raw.exitCode} ${raw.stderr || raw.stdout}`,
      );
    }
    if (performance.now() >= deadline) {
      await terminate(processHandle);
      assert.fail(`helper did not create ${path}`);
    }
    await delay(10);
  }
}

function parseStdout(stdout: string): RecordValue {
  assert.equal(stdout.startsWith("\uFEFF"), false, "stdout must not contain a BOM");
  assert.equal(stdout.endsWith("\n"), true, "stdout must end with LF");
  const body = stdout.slice(0, -1);
  assert.notEqual(body, "");
  assert.equal(/[\r\n]/.test(body), false, "stdout must contain one JSON line");
  assertCompactJson(body);
  assertCanonicalNumberTokens(body);
  const parsed: unknown = JSON.parse(body);
  const envelope = record(parsed);
  if (field(envelope, "ok") === true) {
    assertKeySet(envelope, ["ok", "result"]);
  } else {
    assert.equal(field(envelope, "ok"), false);
    assertKeySet(envelope, ["ok", "error"]);
    const error = record(field(envelope, "error"));
    assertKeySet(error, ["category", "details"]);
    assertErrorDetailsShape(error);
  }
  assertNormalizedNumbers(parsed);
  return envelope;
}

function assertCommandResultShape(
  arguments_: readonly string[],
  envelope: RecordValue,
): void {
  if (field(envelope, "ok") !== true) {
    return;
  }
  const result = record(field(envelope, "result"));
  switch (arguments_[2]) {
    case "set":
      assertKeySet(result, ["key", "value", "revision", "created"]);
      break;
    case "get":
      assertKeySet(result, ["key", "value", "revision"]);
      break;
    case "delete":
      assertKeySet(result, ["key", "deleted_revision", "revision"]);
      break;
    case "list":
      assertKeySet(result, ["entries", "global_revision"]);
      records(field(result, "entries")).forEach((entry) =>
        assertKeySet(entry, ["key", "value", "revision"]),
      );
      break;
    default:
      assert.fail(`unexpected successful command ${arguments_[2] ?? "missing"}`);
  }
}

function assertErrorDetailsShape(error: RecordValue): void {
  const category = string(field(error, "category"));
  const details = record(field(error, "details"));
  switch (category) {
    case "usage":
    case "invalid_json":
    case "invalid_value":
      assertKeySet(details, ["reason"]);
      break;
    case "invalid_argument":
      assertKeySet(details, ["field", "reason"]);
      break;
    case "conflict":
      assertKeySet(details, ["key", "expected", "actual"]);
      break;
    case "not_found":
      assertKeySet(details, ["key"]);
      break;
    case "busy":
      assertKeySet(details, ["timeout_ms"]);
      break;
    case "unsupported_schema":
      assertKeySet(details, ["found", "supported"]);
      break;
    case "invalid_storage":
      assertKeySet(details, "key" in details ? ["reason", "key"] : ["reason"]);
      break;
    case "revision_exhausted":
      assertKeySet(details, ["maximum"]);
      break;
    case "storage_error":
      assertKeySet(details, ["operation", "reason"]);
      break;
    default:
      assert.fail(`unknown error category ${category}`);
  }
}

function assertCompactJson(value: string): void {
  let inString = false;
  let escaped = false;
  for (const character of value) {
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
    } else if (character === '"') {
      inString = true;
    } else {
      assert.equal(/\s/u.test(character), false, "JSON output is not compact");
    }
  }
}

function assertCanonicalNumberTokens(value: string): void {
  let inString = false;
  let escaped = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character !== "-" && !(character !== undefined && /[0-9]/u.test(character))) {
      continue;
    }
    const start = index;
    while (index + 1 < value.length && /[0-9eE+.-]/u.test(value[index + 1] ?? "")) {
      index += 1;
    }
    const token = value.slice(start, index + 1);
    assert.match(token, /^-?(?:0|[1-9][0-9]*)$/u);
    assert.notEqual(token, "-0");
    assert.equal(Number.isSafeInteger(Number(token)), true);
  }
}

function assertNormalizedNumbers(value: unknown): void {
  if (typeof value === "number") {
    assert.equal(Number.isSafeInteger(value), true);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(assertNormalizedNumbers);
    return;
  }
  if (typeof value === "object" && value !== null) {
    Object.values(value).forEach(assertNormalizedNumbers);
  }
}

function assertExpectation(result: RunResult, expectation: RecordValue): void {
  assertAllowedKeys(expectation, ["exit", "stdout", "stderr"]);
  assert.equal(result.exitCode, integer(field(expectation, "exit")));
  assert.equal(result.stderr, string(field(expectation, "stderr")));
  if ("stdout" in expectation) {
    assert.deepEqual(result.envelope, expectation.stdout);
  }
}

function assertStandard(
  result: RunResult,
  exitCode: number,
  envelope: RecordValue,
): void {
  assert.equal(result.exitCode, exitCode);
  assert.equal(result.stderr, "");
  assert.deepEqual(result.envelope, envelope);
  assert.equal(result.stdout, `${result.stdout.slice(0, -1)}\n`);
}

function errorCategory(envelope: RecordValue): string | undefined {
  if (!("error" in envelope)) {
    return undefined;
  }
  return string(field(record(envelope.error), "category"));
}

function sqliteSetup(databasePath: string, setup: RecordValue): void {
  assertAllowedKeys(setup, ["statements"]);
  const database = new DatabaseSync(databasePath, { timeout: 10_000 });
  try {
    for (const statement of strings(field(setup, "statements"))) {
      database.exec(statement);
    }
  } finally {
    database.close();
  }
}

function sqliteAssertions(databasePath: string, assertion: RecordValue): void {
  assertAllowedKeys(assertion, ["queries"]);
  const database = new DatabaseSync(databasePath, {
    readBigInts: true,
    returnArrays: true,
    timeout: 10_000,
  });
  try {
    for (const query of records(field(assertion, "queries"))) {
      assertAllowedKeys(query, ["sql", "rows"]);
      const rows = database.prepare(string(field(query, "sql"))).all() as unknown;
      assert.deepEqual(normalizeSqliteValue(rows), field(query, "rows"));
    }
  } finally {
    database.close();
  }
}

function setupV1(databasePath: string, statements: readonly string[]): void {
  const database = new DatabaseSync(databasePath, { timeout: 10_000 });
  try {
    database.exec(`
        CREATE TABLE store_metadata (
          singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
          schema_version INTEGER NOT NULL CHECK (schema_version = 1),
          global_revision INTEGER NOT NULL
            CHECK (global_revision BETWEEN 0 AND 9007199254740991)
        );
        CREATE TABLE entries (
          key TEXT PRIMARY KEY COLLATE BINARY,
          value_json TEXT NOT NULL CHECK (json_valid(value_json)),
          revision INTEGER NOT NULL
            CHECK (revision BETWEEN 1 AND 9007199254740991)
        );
      `);
    statements.forEach((statement) => database.exec(statement));
  } finally {
    database.close();
  }
}

function assertIntegrity(databasePath: string): void {
  const database = new DatabaseSync(databasePath, {
    returnArrays: true,
    timeout: 10_000,
  });
  try {
    const rows = database.prepare("PRAGMA integrity_check").all() as unknown;
    assert.deepEqual(rows, [["ok"]]);
  } finally {
    database.close();
  }
}

function normalizeSqliteValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    const number = Number(value);
    assert.equal(Number.isSafeInteger(number), true);
    return number;
  }
  if (value instanceof Uint8Array) {
    return [...value];
  }
  if (Array.isArray(value)) {
    return value.map(normalizeSqliteValue);
  }
  return value;
}

async function scenarioPaths(label: string): Promise<ScenarioPaths> {
  await mkdir(SCRATCH_ROOT, { recursive: true });
  const safeLabel = label.replace(/[^A-Za-z0-9._-]/g, "-");
  const directory = await mkdtemp(join(SCRATCH_ROOT, `${safeLabel}-`));
  return {
    directory,
    database: join(directory, "store.db"),
    missingParent: join(directory, "missing-parent", "child"),
  };
}

async function cleanup(
  paths: ScenarioPaths,
  databasePath = paths.database,
): Promise<void> {
  await cleanupDatabaseFiles(databasePath);
  await rm(paths.directory, { force: true, recursive: true });
  assert.equal(await exists(paths.directory), false);
}

async function cleanupDatabaseFiles(databasePath: string): Promise<void> {
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    const path = `${databasePath}${suffix}`;
    await rm(path, { force: true });
    assert.equal(await exists(path), false, `${path} remained after cleanup`);
  }
}

function substituteArguments(
  value: unknown,
  paths: ScenarioPaths,
  replacements: Readonly<Record<string, string>> = {},
): string[] {
  return strings(value).map((argument) => {
    let expanded = argument
      .replaceAll("${DB}", paths.database)
      .replaceAll("${MISSING_PARENT}", paths.missingParent);
    for (const [name, replacement] of Object.entries(replacements)) {
      expanded = expanded.replaceAll(`\${${name}}`, replacement);
    }
    return expanded;
  });
}

function generatedKey(case_: RecordValue): string {
  assertAllowedKeys(case_, ["id", "key", "key_generator"]);
  if ("key" in case_) {
    return string(case_.key);
  }
  const generator = record(field(case_, "key_generator"));
  assertAllowedKeys(generator, ["kind", "prefix", "character", "count"]);
  assert.equal(field(generator, "kind"), "repeat_suffix");
  return (
    string(field(generator, "prefix")) +
    string(field(generator, "character")).repeat(integer(field(generator, "count")))
  );
}

function generatedInput(case_: RecordValue): string {
  if ("input_json" in case_) {
    return string(case_.input_json);
  }
  return generateInput(record(field(case_, "input_generator")));
}

function generateInput(generator: RecordValue): string {
  const kind = string(field(generator, "kind"));
  if (kind === "nested_arrays") {
    assertAllowedKeys(generator, ["kind", "depth", "leaf"]);
    return `${"[".repeat(integer(field(generator, "depth")))}${JSON.stringify(
      field(generator, "leaf"),
    )}${"]".repeat(integer(field(generator, "depth")))}`;
  }
  if (kind === "ascii_string_total_bytes") {
    assertAllowedKeys(generator, ["kind", "character", "total_bytes"]);
    const character = string(field(generator, "character"));
    const total = integer(field(generator, "total_bytes"));
    assert.equal(Buffer.byteLength(character, "utf8"), 1);
    const result = `"${character.repeat(total - 2)}"`;
    assert.equal(Buffer.byteLength(result, "utf8"), total);
    return result;
  }
  assert.fail(`unknown input generator ${kind}`);
}

function generatedNormalized(case_: RecordValue): unknown {
  if ("normalized" in case_) {
    return case_.normalized;
  }
  const generator = record(field(case_, "normalized_generator"));
  const kind = string(field(generator, "kind"));
  if (kind === "nested_arrays") {
    assertAllowedKeys(generator, ["kind", "depth", "leaf"]);
    let value: unknown = field(generator, "leaf");
    for (let depth = 0; depth < integer(field(generator, "depth")); depth += 1) {
      value = [value];
    }
    return value;
  }
  if (kind === "ascii_string_total_bytes") {
    assertAllowedKeys(generator, ["kind", "character", "total_bytes"]);
    return string(field(generator, "character")).repeat(
      integer(field(generator, "total_bytes")) - 2,
    );
  }
  assert.fail(`unknown normalized generator ${kind}`);
}

async function assertSpecVersions(): Promise<void> {
  assert.equal(await readFile(join(SPEC_ROOT, "SPEC_VERSION"), "utf8"), "1.0.0\n");
  for (const path of [
    "fixtures/contract.json",
    "fixtures/keys.json",
    "fixtures/values-accepted.json",
    "fixtures/values-rejected.json",
    "fixtures/scenarios/normal.json",
    "fixtures/scenarios/boundary.json",
    "fixtures/scenarios/invalid.json",
    "fixtures/scenarios/migration.json",
    "fixtures/scenarios/multiprocess.json",
  ]) {
    assert.equal(field(await fixture(path), "spec_version"), SPEC_VERSION);
  }
}

async function assertFrozenManifest(): Promise<void> {
  const manifest = await readFile(join(SPEC_ROOT, "MANIFEST.sha256"), "utf8");
  for (const line of manifest.trimEnd().split("\n")) {
    const match = /^([0-9a-f]{64}) {2}(.+)$/u.exec(line);
    if (match === null) {
      throw new Error(`invalid frozen manifest line: ${line}`);
    }
    const expectedHash = match[1];
    const relativePath = match[2];
    if (expectedHash === undefined || relativePath === undefined) {
      throw new Error(`incomplete frozen manifest line: ${line}`);
    }
    const actualHash = createHash("sha256")
      .update(await readFile(join(SPEC_ROOT, relativePath)))
      .digest("hex");
    assert.equal(actualHash, expectedHash, `frozen file changed: ${relativePath}`);
  }
}

async function fixture(relativePath: string): Promise<RecordValue> {
  const path = join(SPEC_ROOT, relativePath);
  const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
  const document = record(parsed);
  if ("spec_version" in document) {
    assert.equal(document.spec_version, SPEC_VERSION, relativePath);
  }
  return document;
}

function selectedEntry(): string {
  return fileURLToPath(
    new URL(
      selectedComparativeImplementation() === "solution"
        ? "../../solution/node/main.ts"
        : "../../starter/node/main.ts",
      import.meta.url,
    ),
  );
}

function decodeUtf8(value: Buffer, stream: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(value);
  } catch {
    assert.fail(`${stream} is not valid UTF-8`);
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function field(object: RecordValue, name: string): unknown {
  assert.equal(name in object, true, `missing fixture field ${name}`);
  return object[name];
}

function record(value: unknown): RecordValue {
  assert.equal(
    typeof value === "object" && value !== null && !Array.isArray(value),
    true,
    "value must be an object",
  );
  return value as RecordValue;
}

function records(value: unknown): RecordValue[] {
  assert.equal(Array.isArray(value), true, "value must be an array");
  return (value as unknown[]).map(record);
}

function strings(value: unknown): string[] {
  assert.equal(Array.isArray(value), true, "value must be an array");
  return (value as unknown[]).map(string);
}

function string(value: unknown): string {
  assert.equal(typeof value, "string", "value must be a string");
  return value as string;
}

function integer(value: unknown): number {
  assert.equal(Number.isSafeInteger(value), true, "value must be a safe integer");
  return value as number;
}

function assertAllowedKeys(object: RecordValue, allowed: readonly string[]): void {
  const unknown = Object.keys(object).filter((key) => !allowed.includes(key));
  assert.deepEqual(unknown, [], `unknown fixture keys: ${unknown.join(",")}`);
}

function assertKeySet(object: RecordValue, expected: readonly string[]): void {
  assert.deepEqual(Object.keys(object).sort(), [...expected].sort());
}
