import {
  type ApiErrorCode,
  type ErrorDetails,
  StorageError,
  TaskNotFoundError,
  type TaskService,
  ValidationError,
} from "./index.ts";
import { encodeJson, MAX_REQUEST_BYTES, parseStrictJsonBytes } from "./json.ts";

export interface HttpRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: Readonly<Record<string, string | undefined>>;
  readonly body: Uint8Array;
}

export interface HttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: Uint8Array;
}

export type ErrorLogger = (error: unknown) => void;

class RequestDecodeError extends SyntaxError {
  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "RequestDecodeError";
  }
}

function response(
  status: number,
  value?: unknown,
  headers: Readonly<Record<string, string>> = {},
): HttpResponse {
  if (value === undefined) {
    return Object.freeze({
      status,
      headers: Object.freeze({ ...headers }),
      body: new Uint8Array(),
    });
  }
  return Object.freeze({
    status,
    headers: Object.freeze({
      "content-type": "application/json; charset=utf-8",
      ...headers,
    }),
    body: encodeJson(value),
  });
}

function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: ErrorDetails,
  headers: Readonly<Record<string, string>> = {},
): HttpResponse {
  const error: {
    code: ApiErrorCode;
    message: string;
    details?: ErrorDetails;
  } = { code, message };
  if (details !== undefined) error.details = details;
  return response(status, { error }, headers);
}

function methodNotAllowed(allow: string): HttpResponse {
  return errorResponse(
    405,
    "method_not_allowed",
    "method is not allowed for this path",
    undefined,
    { allow },
  );
}

function requireJson(headers: HttpRequest["headers"]): void {
  const raw = headers["content-type"];
  const mediaType = raw?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    throw new RequestDecodeError("request body must use application/json");
  }
}

function parseBody(request: HttpRequest): unknown {
  requireJson(request.headers);
  try {
    return parseStrictJsonBytes(request.body, MAX_REQUEST_BYTES);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new RequestDecodeError("request body must be valid JSON", error);
    }
    throw error;
  }
}

function parseCompletedQuery(url: URL): boolean | undefined {
  for (const key of url.searchParams.keys()) {
    if (key !== "completed") {
      throw new ValidationError(`unknown query parameter: ${key}`, key);
    }
  }
  const values = url.searchParams.getAll("completed");
  if (values.length === 0) return undefined;
  if (values.length !== 1 || (values[0] !== "true" && values[0] !== "false")) {
    throw new ValidationError("completed must be true or false", "completed");
  }
  return values[0] === "true";
}

async function dispatchKnown(
  service: TaskService,
  request: HttpRequest,
): Promise<HttpResponse> {
  const method = request.method.toUpperCase();
  const url = new URL(request.url, "http://tasks.invalid");
  const { pathname } = url;

  if (pathname === "/health") {
    if (method !== "GET") return methodNotAllowed("GET");
    return response(200, { status: "ok" });
  }

  if (pathname === "/tasks") {
    if (method === "GET") {
      return response(200, await service.list(parseCompletedQuery(url)));
    }
    if (method === "POST") {
      return response(201, await service.create(parseBody(request)));
    }
    return methodNotAllowed("GET, POST");
  }

  const item = /^\/tasks\/([^/]+)$/u.exec(pathname);
  if (item !== null) {
    const id = item[1] ?? "";
    if (method === "GET") return response(200, await service.get(id));
    if (method === "PATCH") {
      return response(200, await service.update(id, parseBody(request)));
    }
    if (method === "DELETE") {
      await service.delete(id);
      return response(204);
    }
    return methodNotAllowed("GET, PATCH, DELETE");
  }

  return errorResponse(404, "not_found", "route was not found");
}

export async function dispatchHttp(
  service: TaskService,
  request: HttpRequest,
  logError: ErrorLogger = (error) => console.error(error),
): Promise<HttpResponse> {
  try {
    return await dispatchKnown(service, request);
  } catch (error) {
    if (error instanceof RequestDecodeError) {
      return errorResponse(400, "invalid_json", "request body must be valid JSON");
    }
    if (error instanceof ValidationError) {
      const details = error.field === undefined ? undefined : Object.freeze({ field: error.field });
      return errorResponse(422, "validation_error", error.message, details);
    }
    if (error instanceof TaskNotFoundError) {
      return errorResponse(404, "not_found", error.message);
    }
    if (error instanceof StorageError) {
      logError(error);
      return errorResponse(
        500,
        "internal_error",
        "the server could not complete the request",
      );
    }
    logError(error);
    return errorResponse(
      500,
      "internal_error",
      "the server could not complete the request",
    );
  }
}
