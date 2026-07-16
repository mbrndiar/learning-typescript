import {
  parseDeleteExpectation,
  parseRestrictedJson,
  parseSetExpectation,
  validateKey,
  type DeleteExpectation,
  type JsonValue,
  type SetExpectation,
} from "./domain.ts";
import { invalidArgumentError, KvError, storageError, usageError } from "./errors.ts";
import { SqliteStore } from "./store.ts";

type Command =
  | {
      readonly kind: "set";
      readonly key: string;
      readonly value: JsonValue;
      readonly expectation: SetExpectation;
    }
  | { readonly kind: "get"; readonly key: string }
  | {
      readonly kind: "delete";
      readonly key: string;
      readonly expectation: DeleteExpectation;
    }
  | { readonly kind: "list" };

type ParsedCli = {
  readonly databasePath: string;
  readonly command:
    | {
        readonly kind: "set";
        readonly key: string;
        readonly valueJson: string;
        readonly expectation?: string;
      }
    | { readonly kind: "get"; readonly key: string }
    | {
        readonly kind: "delete";
        readonly key: string;
        readonly expectation?: string;
      }
    | { readonly kind: "list" };
};

export interface ProcessResult {
  readonly exitCode: number;
  readonly envelope: JsonValue;
}

export function runProcess(arguments_: readonly string[]): ProcessResult {
  try {
    const parsed = parseExactCli(arguments_);
    validateDatabasePath(parsed.databasePath);
    const command = validateCommand(parsed.command);
    const store = SqliteStore.open(parsed.databasePath);
    try {
      const result = execute(store, command);
      return { exitCode: 0, envelope: { ok: true, result } };
    } finally {
      store.close();
    }
  } catch (error: unknown) {
    const failure = error instanceof KvError ? error : storageError("open");
    return { exitCode: failure.exitCode, envelope: failure.envelope() };
  }
}

function parseExactCli(arguments_: readonly string[]): ParsedCli {
  if (arguments_.length < 3 || arguments_[0] !== "--db") {
    throw usageError();
  }
  const databasePath = arguments_[1];
  const name = arguments_[2];
  if (databasePath === undefined || name === undefined) {
    throw usageError();
  }

  if (name === "list" && arguments_.length === 3) {
    return { databasePath, command: { kind: "list" } };
  }
  if (name === "get" && arguments_.length === 4 && arguments_[3] !== undefined) {
    return {
      databasePath,
      command: { kind: "get", key: arguments_[3] },
    };
  }
  if (
    name === "delete" &&
    (arguments_.length === 4 ||
      (arguments_.length === 6 && arguments_[4] === "--expect")) &&
    arguments_[3] !== undefined
  ) {
    const expectation = arguments_[5];
    return {
      databasePath,
      command: {
        kind: "delete",
        key: arguments_[3],
        ...(expectation === undefined ? {} : { expectation }),
      },
    };
  }
  if (
    name === "set" &&
    (arguments_.length === 6 ||
      (arguments_.length === 8 && arguments_[6] === "--expect")) &&
    arguments_[4] === "--value-json" &&
    arguments_[3] !== undefined &&
    arguments_[5] !== undefined
  ) {
    const expectation = arguments_[7];
    return {
      databasePath,
      command: {
        kind: "set",
        key: arguments_[3],
        valueJson: arguments_[5],
        ...(expectation === undefined ? {} : { expectation }),
      },
    };
  }
  throw usageError();
}

function validateDatabasePath(value: string): void {
  if (value === "") {
    throw invalidArgumentError("db", "empty");
  }
  if (value === ":memory:" || value.startsWith("file:")) {
    throw invalidArgumentError("db", "unsupported_form");
  }
}

function validateCommand(command: ParsedCli["command"]): Command {
  switch (command.kind) {
    case "list":
      return command;
    case "get":
      return { kind: "get", key: validateKey(command.key) };
    case "delete":
      return {
        kind: "delete",
        key: validateKey(command.key),
        expectation: parseDeleteExpectation(command.expectation),
      };
    case "set":
      return {
        kind: "set",
        key: validateKey(command.key),
        expectation: parseSetExpectation(command.expectation),
        value: parseRestrictedJson(command.valueJson),
      };
  }
}

function execute(store: SqliteStore, command: Command): JsonValue {
  switch (command.kind) {
    case "set":
      return store.set(command.key, command.value, command.expectation);
    case "get": {
      const entry = store.get(command.key);
      return {
        key: entry.key,
        value: entry.value,
        revision: entry.revision,
      };
    }
    case "delete":
      return store.delete(command.key, command.expectation);
    case "list": {
      const result = store.list();
      return {
        entries: result.entries.map((entry) => ({
          key: entry.key,
          value: entry.value,
          revision: entry.revision,
        })),
        global_revision: result.global_revision,
      };
    }
  }
}
