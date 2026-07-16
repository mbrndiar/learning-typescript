import { DatabaseSync } from "node:sqlite";

import {
  MAX_SAFE_REVISION,
  parseStoredJson,
  parseRestrictedJson,
  validateKey,
  type DeleteExpectation,
  type JsonValue,
  type SetExpectation,
} from "./domain.ts";
import { invalidStorageError, KvError, storageError } from "./errors.ts";

export const BUSY_TIMEOUT_MS = 10_000;

const CREATE_METADATA = `
  CREATE TABLE store_metadata (
      singleton       INTEGER PRIMARY KEY CHECK (singleton = 1),
      schema_version  INTEGER NOT NULL CHECK (schema_version = 1),
      global_revision INTEGER NOT NULL
                      CHECK (global_revision BETWEEN 0 AND 9007199254740991)
  )`;

const CREATE_ENTRIES = `
  CREATE TABLE entries (
      key        TEXT PRIMARY KEY COLLATE BINARY,
      value_json TEXT NOT NULL CHECK (json_valid(value_json)),
      revision   INTEGER NOT NULL
                 CHECK (revision BETWEEN 1 AND 9007199254740991)
  )`;

const INSERT_METADATA = `
  INSERT INTO store_metadata(singleton, schema_version, global_revision)
  VALUES (1, 1, 0)`;

const V0_ENTRIES =
  "createtableentries(keytextprimarykeycollatebinary,value_jsontextnotnull)";
const V1_ENTRIES =
  "createtableentries(keytextprimarykeycollatebinary,value_jsontextnotnullcheck(json_valid(value_json)),revisionintegernotnullcheck(revisionbetween1and9007199254740991))";
const V1_METADATA =
  "createtablestore_metadata(singletonintegerprimarykeycheck(singleton=1),schema_versionintegernotnullcheck(schema_version=1),global_revisionintegernotnullcheck(global_revisionbetween0and9007199254740991))";

type SqliteRow = Record<string, unknown>;

export interface Entry {
  readonly key: string;
  readonly value: JsonValue;
  readonly revision: number;
}

export class SqliteStore {
  private constructor(private readonly database: DatabaseSync) {}

  static open(path: string): SqliteStore {
    let database: DatabaseSync;
    try {
      database = new DatabaseSync(path, {
        allowExtension: false,
        enableDoubleQuotedStringLiterals: false,
        enableForeignKeyConstraints: true,
        readBigInts: true,
        timeout: BUSY_TIMEOUT_MS,
      });
    } catch (error: unknown) {
      throw mapSqliteError(error, "open");
    }

    try {
      configure(database);
      prepareSchema(database);
      return new SqliteStore(database);
    } catch (error: unknown) {
      database.close();
      throw error;
    }
  }

  close(): void {
    this.database.close();
  }

  set(
    key: string,
    value: JsonValue,
    expectation: SetExpectation,
  ): {
    readonly key: string;
    readonly value: JsonValue;
    readonly revision: number;
    readonly created: boolean;
  } {
    return immediateTransaction(this.database, "write", () => {
      const current = this.entryRevision(key, "write");
      if (expectation.kind === "absent" && current !== undefined) {
        throw new KvError(3, "conflict", {
          key,
          expected: "absent",
          actual: current,
        });
      }
      if (expectation.kind === "exact" && current !== expectation.revision) {
        throw new KvError(3, "conflict", {
          key,
          expected: expectation.revision,
          actual: current ?? null,
        });
      }

      const revision = this.nextRevision();
      try {
        this.database
          .prepare(
            `INSERT INTO entries(key, value_json, revision) VALUES (?, ?, ?)
             ON CONFLICT(key) DO UPDATE
             SET value_json = excluded.value_json, revision = excluded.revision`,
          )
          .run(key, JSON.stringify(value), BigInt(revision));
        this.updateGlobalRevision(revision);
      } catch (error: unknown) {
        throw mapSqliteError(error, "write");
      }
      return {
        key,
        value,
        revision,
        created: current === undefined,
      };
    });
  }

  get(key: string): Entry {
    let row: SqliteRow | undefined;
    try {
      row = asOptionalRow(
        this.database
          .prepare("SELECT value_json, revision FROM entries WHERE key = ?")
          .get(key),
      );
    } catch (error: unknown) {
      throw mapSqliteError(error, "read");
    }
    if (row === undefined) {
      throw new KvError(4, "not_found", { key });
    }
    return {
      key,
      value: storedValue(row.value_json, key),
      revision: storedRevision(row.revision),
    };
  }

  delete(
    key: string,
    expectation: DeleteExpectation,
  ): {
    readonly key: string;
    readonly deleted_revision: number;
    readonly revision: number;
  } {
    return immediateTransaction(this.database, "write", () => {
      const current = this.entryRevision(key, "write");
      if (current === undefined) {
        throw new KvError(4, "not_found", { key });
      }
      if (expectation.kind === "exact" && current !== expectation.revision) {
        throw new KvError(3, "conflict", {
          key,
          expected: expectation.revision,
          actual: current,
        });
      }

      const revision = this.nextRevision();
      try {
        this.database.prepare("DELETE FROM entries WHERE key = ?").run(key);
        this.updateGlobalRevision(revision);
      } catch (error: unknown) {
        throw mapSqliteError(error, "write");
      }
      return { key, deleted_revision: current, revision };
    });
  }

  list(): { readonly entries: readonly Entry[]; readonly global_revision: number } {
    let rows: SqliteRow[];
    let metadata: SqliteRow | undefined;
    try {
      rows = asRows(
        this.database
          .prepare(
            "SELECT key, value_json, revision FROM entries ORDER BY key COLLATE BINARY",
          )
          .all(),
      );
      metadata = asOptionalRow(
        this.database
          .prepare("SELECT global_revision FROM store_metadata WHERE singleton = 1")
          .get(),
      );
    } catch (error: unknown) {
      throw mapSqliteError(error, "read");
    }
    if (metadata === undefined) {
      throw invalidStorageError("malformed_schema");
    }
    return {
      entries: rows.map((row) => {
        if (typeof row.key !== "string") {
          throw invalidStorageError("malformed_schema");
        }
        return {
          key: row.key,
          value: storedValue(row.value_json, row.key),
          revision: storedRevision(row.revision),
        };
      }),
      global_revision: globalRevision(metadata.global_revision),
    };
  }

  private entryRevision(key: string, operation: string): number | undefined {
    try {
      const row = asOptionalRow(
        this.database.prepare("SELECT revision FROM entries WHERE key = ?").get(key),
      );
      return row === undefined ? undefined : storedRevision(row.revision);
    } catch (error: unknown) {
      throw mapSqliteError(error, operation);
    }
  }

  private nextRevision(): number {
    let row: SqliteRow | undefined;
    try {
      row = asOptionalRow(
        this.database
          .prepare("SELECT global_revision FROM store_metadata WHERE singleton = 1")
          .get(),
      );
    } catch (error: unknown) {
      throw mapSqliteError(error, "write");
    }
    if (row === undefined) {
      throw invalidStorageError("malformed_schema");
    }
    const current = globalRevision(row.global_revision);
    if (current === MAX_SAFE_REVISION) {
      throw new KvError(5, "revision_exhausted", {
        maximum: MAX_SAFE_REVISION,
      });
    }
    return current + 1;
  }

  private updateGlobalRevision(revision: number): void {
    const result = this.database
      .prepare("UPDATE store_metadata SET global_revision = ? WHERE singleton = 1")
      .run(BigInt(revision));
    if (Number(result.changes) !== 1) {
      throw invalidStorageError("malformed_schema");
    }
  }
}

function configure(database: DatabaseSync): void {
  try {
    database.exec("PRAGMA busy_timeout = 10000; PRAGMA foreign_keys = ON");
    configureJournalMode(database);
  } catch (error: unknown) {
    if (error instanceof KvError) {
      throw error;
    }
    throw mapSqliteError(error, "configure");
  }
}

function configureJournalMode(database: DatabaseSync): void {
  const deadline = performance.now() + BUSY_TIMEOUT_MS;
  while (true) {
    try {
      const row = asOptionalRow(database.prepare("PRAGMA journal_mode = WAL").get());
      const mode = row === undefined ? undefined : Object.values(row)[0];
      if (typeof mode === "string" && mode.toLowerCase() === "wal") {
        return;
      }
      if (performance.now() >= deadline) {
        throw storageError("configure");
      }
    } catch (error: unknown) {
      if (!isBusyError(error)) {
        throw error;
      }
      if (performance.now() >= deadline) {
        throw new KvError(5, "busy", { timeout_ms: BUSY_TIMEOUT_MS });
      }
    }
    sleepSynchronously(10);
  }
}

function prepareSchema(database: DatabaseSync): void {
  immediateTransaction(database, "initialize", () => {
    const future = futureSchemaVersion(database);
    if (future !== undefined && future > 1) {
      throw new KvError(5, "unsupported_schema", {
        found: future,
        supported: 1,
      });
    }
    ensureIntegrity(database);
    ensureDefaultPragmas(database);
    const objects = applicationObjects(database);
    if (objects.length === 0) {
      initialize(database);
    } else if (isExactV0(objects)) {
      migrateV0(database);
    } else if (isExactV1(objects)) {
      validateV1(database);
    } else {
      throw invalidStorageError("malformed_schema");
    }
  });
}

function initialize(database: DatabaseSync): void {
  try {
    database.exec(`${CREATE_METADATA};${CREATE_ENTRIES};${INSERT_METADATA};`);
  } catch (error: unknown) {
    throw mapSqliteError(error, "initialize");
  }
}

function migrateV0(database: DatabaseSync): void {
  let rows: SqliteRow[];
  try {
    rows = asRows(
      database
        .prepare("SELECT key, value_json FROM entries ORDER BY key COLLATE BINARY")
        .all(),
    );
  } catch (error: unknown) {
    throw mapSqliteError(error, "migrate");
  }

  const normalized = rows.map((row) => {
    if (typeof row.key !== "string" || typeof row.value_json !== "string") {
      throw invalidStorageError("malformed_schema");
    }
    try {
      validateKey(row.key);
    } catch {
      throw invalidStorageError("invalid_key", row.key);
    }
    let value: JsonValue;
    try {
      value = parseRestrictedJson(row.value_json);
    } catch {
      throw invalidStorageError("invalid_value", row.key);
    }
    return { key: row.key, valueJson: JSON.stringify(value) };
  });

  try {
    database.exec(`
      ALTER TABLE entries RENAME TO entries_v0_migration;
      ${CREATE_METADATA};
      ${CREATE_ENTRIES};
      ${INSERT_METADATA};
    `);
    const insert = database.prepare(
      "INSERT INTO entries(key, value_json, revision) VALUES (?, ?, ?)",
    );
    normalized.forEach((row, index) => {
      insert.run(row.key, row.valueJson, BigInt(index + 1));
    });
    database
      .prepare("UPDATE store_metadata SET global_revision = ? WHERE singleton = 1")
      .run(BigInt(normalized.length));
    database.exec("DROP TABLE entries_v0_migration");
  } catch (error: unknown) {
    throw mapSqliteError(error, "migrate");
  }
}

function validateV1(database: DatabaseSync): void {
  let metadataRows: SqliteRow[];
  let entryRows: SqliteRow[];
  try {
    metadataRows = asRows(
      database
        .prepare(
          "SELECT singleton, schema_version, global_revision FROM store_metadata",
        )
        .all(),
    );
    entryRows = asRows(
      database
        .prepare(
          "SELECT key, value_json, revision FROM entries ORDER BY key COLLATE BINARY",
        )
        .all(),
    );
  } catch {
    throw invalidStorageError("malformed_schema");
  }
  if (metadataRows.length !== 1) {
    throw invalidStorageError("malformed_schema");
  }
  const metadata = metadataRows[0];
  if (
    metadata === undefined ||
    metadata.singleton !== 1n ||
    metadata.schema_version !== 1n
  ) {
    throw invalidStorageError("malformed_schema");
  }
  const global = globalRevision(metadata.global_revision);
  const seen = new Set<number>();
  for (const row of entryRows) {
    if (typeof row.key !== "string") {
      throw invalidStorageError("malformed_schema");
    }
    try {
      validateKey(row.key);
    } catch {
      throw invalidStorageError("invalid_key", row.key);
    }
    storedValue(row.value_json, row.key);
    const revision = storedRevision(row.revision);
    if (revision > global || seen.has(revision)) {
      throw invalidStorageError("revision_invariant");
    }
    seen.add(revision);
  }
}

function ensureIntegrity(database: DatabaseSync): void {
  try {
    const rows = asRows(database.prepare("PRAGMA integrity_check").all());
    const messages = rows.map((row) => Object.values(row)[0]);
    if (messages.length !== 1 || messages[0] !== "ok") {
      throw invalidStorageError("integrity_check_failed");
    }
  } catch (error: unknown) {
    if (error instanceof KvError) {
      throw error;
    }
    throw invalidStorageError("integrity_check_failed");
  }
}

function ensureDefaultPragmas(database: DatabaseSync): void {
  try {
    const user = Object.values(
      asOptionalRow(database.prepare("PRAGMA user_version").get()) ?? {},
    )[0];
    const application = Object.values(
      asOptionalRow(database.prepare("PRAGMA application_id").get()) ?? {},
    )[0];
    if (user !== 0n || application !== 0n) {
      throw invalidStorageError("malformed_schema");
    }
  } catch (error: unknown) {
    if (error instanceof KvError) {
      throw error;
    }
    throw invalidStorageError("malformed_schema");
  }
}

function futureSchemaVersion(database: DatabaseSync): number | undefined {
  try {
    const row = asOptionalRow(
      database.prepare("SELECT schema_version FROM store_metadata LIMIT 1").get(),
    );
    if (row === undefined) {
      return undefined;
    }
    const value = row.schema_version;
    if (
      typeof value === "bigint" &&
      value >= 0n &&
      value <= BigInt(MAX_SAFE_REVISION)
    ) {
      return Number(value);
    }
    return undefined;
  } catch (error: unknown) {
    if (isCorruptionError(error)) {
      throw invalidStorageError("integrity_check_failed");
    }
    return undefined;
  }
}

type SchemaObject = {
  readonly type: string;
  readonly name: string;
  readonly sql: string | null;
};

function applicationObjects(database: DatabaseSync): SchemaObject[] {
  let rows: SqliteRow[];
  try {
    rows = asRows(
      database
        .prepare(
          `SELECT type, name, sql
           FROM sqlite_schema
           WHERE name NOT LIKE 'sqlite_%'
           ORDER BY type COLLATE BINARY, name COLLATE BINARY`,
        )
        .all(),
    );
  } catch (error: unknown) {
    throw mapSqliteError(error, "read");
  }
  return rows.map((row) => {
    if (
      typeof row.type !== "string" ||
      typeof row.name !== "string" ||
      (typeof row.sql !== "string" && row.sql !== null)
    ) {
      throw invalidStorageError("malformed_schema");
    }
    return { type: row.type, name: row.name, sql: row.sql };
  });
}

function isExactV0(objects: readonly SchemaObject[]): boolean {
  const object = objects[0];
  return (
    objects.length === 1 &&
    object?.type === "table" &&
    object.name === "entries" &&
    object.sql !== null &&
    canonicalSql(object.sql) === V0_ENTRIES
  );
}

function isExactV1(objects: readonly SchemaObject[]): boolean {
  if (objects.length !== 2) {
    return false;
  }
  const entries = objects.find((object) => object.name === "entries");
  const metadata = objects.find((object) => object.name === "store_metadata");
  return (
    entries?.type === "table" &&
    entries.sql !== null &&
    canonicalSql(entries.sql) === V1_ENTRIES &&
    metadata?.type === "table" &&
    metadata.sql !== null &&
    canonicalSql(metadata.sql) === V1_METADATA
  );
}

function canonicalSql(value: string): string {
  return [...value]
    .filter(
      (character) =>
        !/\s/u.test(character) && !['"', "'", "`", "[", "]"].includes(character),
    )
    .join("")
    .toLowerCase();
}

function immediateTransaction<T>(
  database: DatabaseSync,
  operation: string,
  body: () => T,
): T {
  try {
    database.exec("BEGIN IMMEDIATE");
  } catch (error: unknown) {
    throw mapSqliteError(error, operation);
  }

  let result: T;
  try {
    result = body();
  } catch (error: unknown) {
    rollback(database);
    throw error;
  }
  try {
    database.exec("COMMIT");
  } catch (error: unknown) {
    rollback(database);
    throw mapSqliteError(error, "commit");
  }
  return result;
}

function rollback(database: DatabaseSync): void {
  try {
    database.exec("ROLLBACK");
  } catch {
    // Preserve the original normative failure.
  }
}

function storedValue(value: unknown, key: string): JsonValue {
  if (typeof value !== "string") {
    throw invalidStorageError("malformed_schema");
  }
  try {
    return parseStoredJson(value);
  } catch {
    throw invalidStorageError("invalid_value", key);
  }
}

function storedRevision(value: unknown): number {
  if (typeof value !== "bigint" || value < 1n || value > BigInt(MAX_SAFE_REVISION)) {
    throw invalidStorageError("revision_invariant");
  }
  return Number(value);
}

function globalRevision(value: unknown): number {
  if (typeof value !== "bigint" || value < 0n || value > BigInt(MAX_SAFE_REVISION)) {
    throw invalidStorageError("revision_invariant");
  }
  return Number(value);
}

function asRows(value: unknown): SqliteRow[] {
  if (!Array.isArray(value)) {
    throw invalidStorageError("malformed_schema");
  }
  return value.map((row) => {
    if (typeof row !== "object" || row === null || Array.isArray(row)) {
      throw invalidStorageError("malformed_schema");
    }
    return row as SqliteRow;
  });
}

function asOptionalRow(value: unknown): SqliteRow | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalidStorageError("malformed_schema");
  }
  return value as SqliteRow;
}

function mapSqliteError(error: unknown, operation: string): KvError {
  if (isBusyError(error)) {
    return new KvError(5, "busy", { timeout_ms: BUSY_TIMEOUT_MS });
  }
  if (isCorruptionError(error)) {
    return invalidStorageError("integrity_check_failed");
  }
  return storageError(operation);
}

function isBusyError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /database is (?:locked|busy)|SQLITE_(?:BUSY|LOCKED)/i.test(message);
}

function isCorruptionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /not a database|database disk image is malformed|database corrupt/i.test(
    message,
  );
}

function sleepSynchronously(milliseconds: number): void {
  Atomics.wait(
    new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT)),
    0,
    0,
    milliseconds,
  );
}
