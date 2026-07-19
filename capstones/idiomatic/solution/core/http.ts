import type {
  RelayError,
  RelayHttpHandler,
  RelayHttpRequest,
  RelayHttpResponse,
  RelayHttpTarget,
  ReplayQuery,
} from "./contracts.ts";
import { parseEvent } from "./domain.ts";
import { RelayFailure, relayFailure } from "./errors.ts";

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
} as const;
const maximumBodyBytes = 64 * 1024;

function json(
  status: number,
  value: unknown,
  headers: Readonly<Record<string, string>> = {},
): RelayHttpResponse {
  return {
    status,
    headers: { ...jsonHeaders, ...headers },
    body: `${JSON.stringify(value)}\n`,
  };
}

function errorResponse(
  status: number,
  error: RelayError,
  headers: Readonly<Record<string, string>> = {},
): RelayHttpResponse {
  const details: Record<string, unknown> = { ...(error.details ?? {}) };
  if (error.path !== undefined) {
    details.path = error.path;
  }
  return json(
    status,
    {
      error: {
        code: error.code,
        message: error.message,
        details,
      },
    },
    headers,
  );
}

function methodNotAllowed(allow: string): RelayHttpResponse {
  return errorResponse(
    405,
    {
      code: "invalid_query",
      message: "method is not allowed for this path",
    },
    { allow },
  );
}

function parseInteger(
  value: string,
  name: string,
  minimum: number,
  maximum: number,
): number {
  if (!/^(?:0|[1-9]\d*)$/.test(value)) {
    throw relayFailure(
      "invalid_query",
      `${name} must be an integer from ${minimum} to ${maximum}`,
    );
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw relayFailure(
      "invalid_query",
      `${name} must be an integer from ${minimum} to ${maximum}`,
    );
  }
  return parsed;
}

function queryFromUrl(url: URL): ReplayQuery {
  const allowed = new Set(["after", "kind", "source", "limit"]);
  for (const key of url.searchParams.keys()) {
    if (!allowed.has(key) || url.searchParams.getAll(key).length !== 1) {
      throw relayFailure("invalid_query", `invalid query parameter: ${key}`);
    }
  }
  const after = url.searchParams.get("after");
  const limit = url.searchParams.get("limit");
  const kind = url.searchParams.get("kind");
  const source = url.searchParams.get("source");
  if (kind !== null && kind !== "metric" && kind !== "alert") {
    throw relayFailure("invalid_query", "kind must be metric or alert");
  }
  return {
    ...(after === null
      ? {}
      : { after: parseInteger(after, "after", 0, Number.MAX_SAFE_INTEGER) }),
    ...(limit === null ? {} : { limit: parseInteger(limit, "limit", 1, 1_000) }),
    ...(kind === null ? {} : { kind }),
    ...(source === null ? {} : { source }),
  };
}

async function readBody(request: RelayHttpRequest): Promise<unknown> {
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    const length = parseInteger(declared, "content-length", 0, Number.MAX_SAFE_INTEGER);
    if (length > maximumBodyBytes) {
      throw relayFailure("body_too_large", "request body exceeds 64 KiB");
    }
  }
  if (request.body === null) {
    throw relayFailure("invalid_json", "request body is required");
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of request.body) {
    size += chunk.byteLength;
    if (size > maximumBodyBytes) {
      throw relayFailure("body_too_large", "request body exceeds 64 KiB");
    }
    chunks.push(chunk);
  }
  if (size === 0) {
    throw relayFailure("invalid_json", "request body is required");
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw relayFailure("invalid_json", "request body is not valid UTF-8");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw relayFailure("invalid_json", "request body must contain one JSON value");
  }
}

function statusFor(error: RelayFailure): number {
  switch (error.code) {
    case "invalid_event":
    case "invalid_json":
    case "invalid_query":
    case "invalid_cli":
      return 400;
    case "body_too_large":
      return 413;
    case "log_full":
    case "subscriber_failed":
    case "cancelled":
    case "shutting_down":
      return 503;
    case "log_corrupt":
    case "unsupported_log_version":
    case "log_io":
    case "not_implemented":
      return 500;
  }
}

export function createRelayHttpHandler(relay: RelayHttpTarget): RelayHttpHandler {
  return async (request): Promise<RelayHttpResponse> => {
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      if (url.pathname === "/healthz") {
        if (url.search !== "") {
          throw relayFailure(
            "invalid_query",
            "health endpoint does not accept query values",
          );
        }
        if (request.method !== "GET") {
          return methodNotAllowed("GET");
        }
        return relay.accepting
          ? json(200, { status: "ok" })
          : errorResponse(503, {
              code: "shutting_down",
              message: "relay is shutting down",
            });
      }
      if (url.pathname !== "/v1/events") {
        return errorResponse(404, {
          code: "invalid_query",
          message: "path was not found",
        });
      }
      if (request.method === "POST") {
        if (url.search !== "") {
          throw relayFailure(
            "invalid_query",
            "event ingestion does not accept query values",
          );
        }
        const contentType = request.headers
          .get("content-type")
          ?.split(";", 1)[0]
          ?.trim()
          .toLowerCase();
        if (contentType !== "application/json") {
          return errorResponse(415, {
            code: "invalid_json",
            message: "content-type must be application/json",
          });
        }
        const parsed = parseEvent(await readBody(request));
        if (!parsed.ok) {
          return errorResponse(400, {
            ...parsed.error,
            message: "event validation failed",
          });
        }
        return json(201, await relay.submit(parsed.event));
      }
      if (request.method === "GET") {
        const events = [];
        for await (const event of relay.eventLog.replay(queryFromUrl(url))) {
          events.push(event);
        }
        return json(200, { events });
      }
      return methodNotAllowed("GET, POST");
    } catch (error: unknown) {
      const failure =
        error instanceof RelayFailure
          ? error
          : relayFailure("log_io", "internal relay error");
      return errorResponse(statusFor(failure), failure.toRelayError());
    }
  };
}
