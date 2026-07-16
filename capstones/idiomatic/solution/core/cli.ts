import type {
  RelayError,
  ReplayQuery,
  RuntimeCapabilities,
  ServeOptions,
} from "./contracts.ts";
import { parseEvent } from "./domain.ts";
import { RelayFailure, relayFailure } from "./errors.ts";
import { createRelayHttpHandler } from "./http.ts";
import { decodeNdjsonLines } from "./ndjson.ts";
import { EventRelay } from "./relay.ts";

export type RelayCommand =
  | {
      readonly kind: "ingest";
      readonly log: string;
      readonly input: string;
      readonly capacity: number;
    }
  | {
      readonly kind: "replay";
      readonly log: string;
      readonly query: ReplayQuery;
    }
  | {
      readonly kind: "serve";
      readonly log: string;
      readonly options: ServeOptions;
      readonly queueCapacity: number;
    };

const usage = "usage: relay <ingest|replay|serve> --log PATH [command options]";

function integerOption(
  value: string,
  flag: string,
  minimum: number,
  maximum: number,
): number {
  if (!/^(?:0|[1-9]\d*)$/.test(value)) {
    throw relayFailure(
      "invalid_cli",
      `${flag} must be an integer from ${minimum} to ${maximum}`,
    );
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw relayFailure(
      "invalid_cli",
      `${flag} must be an integer from ${minimum} to ${maximum}`,
    );
  }
  return parsed;
}

function optionMap(arguments_: readonly string[]): ReadonlyMap<string, string> {
  const options = new Map<string, string>();
  for (let index = 0; index < arguments_.length; index += 2) {
    const flag = arguments_[index];
    const value = arguments_[index + 1];
    if (flag === undefined || !flag.startsWith("--") || value === undefined) {
      throw relayFailure("invalid_cli", usage);
    }
    if (options.has(flag)) {
      throw relayFailure("invalid_cli", `duplicate option: ${flag}`);
    }
    options.set(flag, value);
  }
  return options;
}

function requiredLog(options: ReadonlyMap<string, string>): string {
  const log = options.get("--log");
  if (log === undefined || log.length === 0) {
    throw relayFailure("invalid_cli", "--log requires a path");
  }
  return log;
}

function rejectUnknown(
  options: ReadonlyMap<string, string>,
  allowed: readonly string[],
): void {
  const permitted = new Set(allowed);
  for (const flag of options.keys()) {
    if (!permitted.has(flag)) {
      throw relayFailure("invalid_cli", `unknown option: ${flag}`);
    }
  }
}

export function parseRelayCli(arguments_: readonly string[]): RelayCommand {
  const command = arguments_[0];
  const options = optionMap(arguments_.slice(1));
  if (command === "ingest") {
    rejectUnknown(options, ["--log", "--input", "--capacity"]);
    return {
      kind: "ingest",
      log: requiredLog(options),
      input: options.get("--input") ?? "-",
      capacity: integerOption(
        options.get("--capacity") ?? "10000",
        "--capacity",
        1,
        100_000,
      ),
    };
  }
  if (command === "replay") {
    rejectUnknown(options, ["--log", "--after", "--kind", "--source", "--limit"]);
    const kind = options.get("--kind");
    if (kind !== undefined && kind !== "metric" && kind !== "alert") {
      throw relayFailure("invalid_cli", "--kind must be metric or alert");
    }
    return {
      kind: "replay",
      log: requiredLog(options),
      query: {
        after: integerOption(
          options.get("--after") ?? "0",
          "--after",
          0,
          Number.MAX_SAFE_INTEGER,
        ),
        limit: integerOption(options.get("--limit") ?? "100", "--limit", 1, 1_000),
        ...(kind === undefined ? {} : { kind }),
        ...(options.has("--source") ? { source: options.get("--source") ?? "" } : {}),
      },
    };
  }
  if (command === "serve") {
    rejectUnknown(options, ["--log", "--host", "--port", "--queue-capacity"]);
    const host = options.get("--host") ?? "127.0.0.1";
    if (host !== "127.0.0.1" && host !== "::1" && host !== "localhost") {
      throw relayFailure("invalid_cli", "--host must name a loopback interface");
    }
    return {
      kind: "serve",
      log: requiredLog(options),
      options: {
        host,
        port: integerOption(options.get("--port") ?? "8080", "--port", 1, 65_535),
      },
      queueCapacity: integerOption(
        options.get("--queue-capacity") ?? "64",
        "--queue-capacity",
        1,
        1_024,
      ),
    };
  }
  throw relayFailure("invalid_cli", usage);
}

function diagnostic(error: RelayError): string {
  const details: Record<string, unknown> = { ...(error.details ?? {}) };
  if (error.path !== undefined) {
    details.path = error.path;
  }
  return `${JSON.stringify({
    error: {
      code: error.code,
      message: error.message,
      details,
    },
  })}\n`;
}

function exitFor(error: RelayFailure): number {
  switch (error.code) {
    case "invalid_cli":
    case "invalid_query":
      return 2;
    case "invalid_event":
    case "invalid_json":
    case "body_too_large":
      return 3;
    case "log_corrupt":
    case "unsupported_log_version":
    case "log_full":
    case "log_io":
      return 4;
    case "subscriber_failed":
    case "shutting_down":
    case "not_implemented":
      return 5;
    case "cancelled":
      return 130;
  }
}

function invalidLine(line: number, error: RelayError): string {
  return `${JSON.stringify({ ok: false, line, error })}\n`;
}

async function runIngest(
  command: Extract<RelayCommand, { readonly kind: "ingest" }>,
  capabilities: RuntimeCapabilities,
): Promise<number> {
  const log = capabilities.openLog(command.log, command.capacity);
  const relay = new EventRelay(log);
  let invalid = false;
  try {
    for await (const line of decodeNdjsonLines(
      capabilities.readInput(command.input, capabilities.signal),
      capabilities.signal,
    )) {
      if (line.text.trim().length === 0) {
        continue;
      }
      let value: unknown;
      try {
        value = JSON.parse(line.text) as unknown;
      } catch {
        invalid = true;
        capabilities.io.stdout(
          invalidLine(line.number, {
            code: "invalid_json",
            message: "line must contain valid JSON",
          }),
        );
        continue;
      }
      const parsed = parseEvent(value);
      if (!parsed.ok) {
        invalid = true;
        capabilities.io.stdout(invalidLine(line.number, parsed.error));
        continue;
      }
      const event = await relay.submit(parsed.event, capabilities.signal);
      capabilities.io.stdout(
        `${JSON.stringify({ ok: true, line: line.number, event })}\n`,
      );
    }
    return invalid ? 3 : 0;
  } finally {
    await relay.close();
  }
}

async function runReplay(
  command: Extract<RelayCommand, { readonly kind: "replay" }>,
  capabilities: RuntimeCapabilities,
): Promise<number> {
  const log = capabilities.openLog(command.log, 100_000);
  try {
    for await (const event of log.replay(command.query, capabilities.signal)) {
      capabilities.io.stdout(`${JSON.stringify(event)}\n`);
    }
    return 0;
  } finally {
    await log.close();
  }
}

async function runServe(
  command: Extract<RelayCommand, { readonly kind: "serve" }>,
  capabilities: RuntimeCapabilities,
): Promise<number> {
  const log = capabilities.openLog(command.log, 10_000);
  const relay = new EventRelay(log, [], command.queueCapacity);
  const onAbort = () => relay.stopAccepting();
  capabilities.signal.addEventListener("abort", onAbort, { once: true });
  try {
    await capabilities.serve(
      command.options,
      createRelayHttpHandler(relay),
      capabilities.signal,
    );
    return 0;
  } finally {
    capabilities.signal.removeEventListener("abort", onAbort);
    await relay.close();
  }
}

export async function runRelayCli(
  arguments_: readonly string[],
  capabilities: RuntimeCapabilities,
): Promise<number> {
  try {
    const command = parseRelayCli(arguments_);
    if (capabilities.signal.aborted) {
      throw relayFailure("cancelled", "operation was cancelled");
    }
    switch (command.kind) {
      case "ingest":
        return await runIngest(command, capabilities);
      case "replay":
        return await runReplay(command, capabilities);
      case "serve":
        return await runServe(command, capabilities);
      default: {
        const exhaustive: never = command;
        throw new Error(`unknown command: ${String(exhaustive)}`);
      }
    }
  } catch (error: unknown) {
    const failure =
      error instanceof RelayFailure
        ? error
        : relayFailure("log_io", "relay operation failed");
    capabilities.io.stderr(diagnostic(failure.toRelayError()));
    return exitFor(failure);
  }
}
