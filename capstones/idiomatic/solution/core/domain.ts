import type {
  AlertEvent,
  MetricEvent,
  ParseResult,
  RelayError,
  ReplayQuery,
  StoredEvent,
} from "./contracts.ts";
import { relayFailure } from "./errors.ts";

const identifierPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const metricNamePattern = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
const tagNamePattern = /^[A-Za-z][A-Za-z0-9_.-]{0,31}$/;
const alertCodePattern = /^[A-Z][A-Z0-9_]{0,63}$/;
const timestampPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/;

function failure(path: string, message: string): ParseResult {
  const error: RelayError = { code: "invalid_event", path, message };
  return { ok: false, error };
}

function own(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor !== undefined && "value" in descriptor
    ? descriptor.value
    : undefined;
}

function characterLength(value: string): number {
  return Array.from(value).length;
}

function containsControl(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x1f || codePoint === 0x7f) {
      return true;
    }
  }
  return false;
}

function hasExactKeys(
  value: object,
  required: readonly string[],
  optional: readonly string[] = [],
): ParseResult | undefined {
  const permitted = new Set([...required, ...optional]);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      return failure(String(key), "symbol properties are not allowed");
    }
    if (!permitted.has(key)) {
      return failure(key, `unknown property: ${key}`);
    }
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) {
      return failure(key, `${key} is required`);
    }
  }
  return undefined;
}

function validCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= (days[month - 1] ?? 0);
}

function normalizeTimestamp(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const match = timestampPattern.exec(value);
  if (match === null) {
    return undefined;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offset = match[8] ?? "";
  if (!validCalendarDate(year, month, day) || hour > 23 || minute > 59 || second > 59) {
    return undefined;
  }
  if (offset !== "Z") {
    const offsetHour = Number(offset.slice(1, 3));
    const offsetMinute = Number(offset.slice(4, 6));
    if (offsetHour > 23 || offsetMinute > 59) {
      return undefined;
    }
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) {
    return undefined;
  }
  const normalized = new Date(milliseconds).toISOString();
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(normalized)
    ? normalized
    : undefined;
}

function parseShared(value: object):
  | {
      readonly ok: true;
      readonly id: string;
      readonly source: string;
      readonly observedAt: string;
    }
  | { readonly ok: false; readonly result: ParseResult } {
  const id = own(value, "id");
  if (typeof id !== "string" || !identifierPattern.test(id)) {
    return {
      ok: false,
      result: failure("id", "id must match [A-Za-z0-9][A-Za-z0-9._:-]{0,63}"),
    };
  }
  const rawSource = own(value, "source");
  if (typeof rawSource !== "string") {
    return { ok: false, result: failure("source", "source must be a string") };
  }
  const source = rawSource.trim();
  if (
    characterLength(source) < 1 ||
    characterLength(source) > 64 ||
    containsControl(rawSource)
  ) {
    return {
      ok: false,
      result: failure(
        "source",
        "source must be a trimmed, control-free string of 1 to 64 characters",
      ),
    };
  }
  const observedAt = normalizeTimestamp(own(value, "observedAt"));
  if (observedAt === undefined) {
    return {
      ok: false,
      result: failure(
        "observedAt",
        "observedAt must be an RFC 3339 timestamp with Z or a numeric offset",
      ),
    };
  }
  return { ok: true, id, source, observedAt };
}

function parseTags(
  value: unknown,
  present: boolean,
):
  | { readonly ok: true; readonly tags?: Readonly<Record<string, string>> }
  | {
      readonly ok: false;
      readonly result: ParseResult;
    } {
  if (!present) {
    return { ok: true };
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, result: failure("tags", "tags must be an object") };
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) {
    return {
      ok: false,
      result: failure("tags", "symbol tag properties are not allowed"),
    };
  }
  const keys = ownKeys.filter((key): key is string => typeof key === "string");
  if (keys.length > 16) {
    return {
      ok: false,
      result: failure("tags", "tags must contain at most 16 properties"),
    };
  }
  const tags: Record<string, string> = {};
  for (const key of keys.sort()) {
    if (!tagNamePattern.test(key)) {
      return {
        ok: false,
        result: failure(
          `tags.${key}`,
          "tag names must match [A-Za-z][A-Za-z0-9_.-]{0,31}",
        ),
      };
    }
    const tagValue = own(value, key);
    if (
      typeof tagValue !== "string" ||
      characterLength(tagValue) > 64 ||
      containsControl(tagValue)
    ) {
      return {
        ok: false,
        result: failure(
          `tags.${key}`,
          "tag values must be control-free strings of at most 64 characters",
        ),
      };
    }
    tags[key] = tagValue;
  }
  return { ok: true, tags };
}

function parseMetric(value: object): ParseResult {
  const keyFailure = hasExactKeys(
    value,
    ["kind", "id", "source", "observedAt", "name", "value"],
    ["tags"],
  );
  if (keyFailure !== undefined) {
    return keyFailure;
  }
  const shared = parseShared(value);
  if (!shared.ok) {
    return shared.result;
  }
  const name = own(value, "name");
  if (typeof name !== "string" || !metricNamePattern.test(name)) {
    return {
      ok: false,
      error: {
        code: "invalid_event",
        path: "name",
        message: "name must match [A-Za-z][A-Za-z0-9_.-]{0,63}",
      },
    };
  }
  const rawValue = own(value, "value");
  if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
    return failure("value", "value must be a finite number");
  }
  const parsedTags = parseTags(own(value, "tags"), Object.hasOwn(value, "tags"));
  if (!parsedTags.ok) {
    return parsedTags.result;
  }
  const event: MetricEvent = {
    kind: "metric",
    id: shared.id,
    source: shared.source,
    observedAt: shared.observedAt,
    name,
    value: Object.is(rawValue, -0) ? 0 : rawValue,
    ...(parsedTags.tags === undefined ? {} : { tags: parsedTags.tags }),
  };
  return { ok: true, event };
}

function parseAlert(value: object): ParseResult {
  const keyFailure = hasExactKeys(value, [
    "kind",
    "id",
    "source",
    "observedAt",
    "code",
    "severity",
    "message",
  ]);
  if (keyFailure !== undefined) {
    return keyFailure;
  }
  const shared = parseShared(value);
  if (!shared.ok) {
    return shared.result;
  }
  const code = own(value, "code");
  if (typeof code !== "string" || !alertCodePattern.test(code)) {
    return {
      ok: false,
      error: {
        code: "invalid_event",
        path: "code",
        message: "code must match [A-Z][A-Z0-9_]{0,63}",
      },
    };
  }
  const severity = own(value, "severity");
  if (severity !== "info" && severity !== "warning" && severity !== "error") {
    return failure("severity", "severity must be info, warning, or error");
  }
  const rawMessage = own(value, "message");
  if (typeof rawMessage !== "string") {
    return failure("message", "message must be a string");
  }
  const message = rawMessage.trim();
  if (
    characterLength(message) < 1 ||
    characterLength(message) > 256 ||
    containsControl(rawMessage)
  ) {
    return failure(
      "message",
      "message must be a trimmed, control-free string of 1 to 256 characters",
    );
  }
  const event: AlertEvent = {
    kind: "alert",
    id: shared.id,
    source: shared.source,
    observedAt: shared.observedAt,
    code,
    severity,
    message,
  };
  return { ok: true, event };
}

function parseEventValue(value: unknown): ParseResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return failure("", "event must be a non-null, non-array object");
  }
  const kind = own(value, "kind");
  if (kind === "metric") {
    return parseMetric(value);
  }
  if (kind === "alert") {
    return parseAlert(value);
  }
  return failure("kind", "kind must be metric or alert");
}

export function parseEvent(value: unknown): ParseResult {
  try {
    return parseEventValue(value);
  } catch {
    return failure("", "event could not be inspected safely");
  }
}

export function normalizeReplayQuery(
  query: ReplayQuery,
): Required<Pick<ReplayQuery, "after" | "limit">> &
  Pick<ReplayQuery, "kind" | "source"> {
  const after = query.after ?? 0;
  const limit = query.limit ?? 100;
  if (!Number.isSafeInteger(after) || after < 0) {
    throw relayFailure("invalid_query", "after must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1_000) {
    throw relayFailure("invalid_query", "limit must be an integer from 1 to 1000");
  }
  if (query.kind !== undefined && query.kind !== "metric" && query.kind !== "alert") {
    throw relayFailure("invalid_query", "kind must be metric or alert");
  }
  if (
    query.source !== undefined &&
    (query.source.trim().length < 1 ||
      characterLength(query.source.trim()) > 64 ||
      containsControl(query.source))
  ) {
    throw relayFailure(
      "invalid_query",
      "source must be a control-free string of 1 to 64 characters",
    );
  }
  return {
    after,
    limit,
    ...(query.kind === undefined ? {} : { kind: query.kind }),
    ...(query.source === undefined ? {} : { source: query.source.trim() }),
  };
}

export function eventMatches(event: StoredEvent, query: ReplayQuery): boolean {
  const normalized = normalizeReplayQuery(query);
  return (
    event.sequence > normalized.after &&
    (normalized.kind === undefined || event.kind === normalized.kind) &&
    (normalized.source === undefined || event.source === normalized.source)
  );
}

export function assertNever(value: never): never {
  throw new Error(`unreachable event variant: ${String(value)}`);
}
