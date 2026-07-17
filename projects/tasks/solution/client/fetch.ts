import {
  ApiError,
  type ApiErrorCode,
  ClientProtocolError,
  ClientTransportError,
  type CreateTaskDto,
  type ErrorDetails,
  parseCreateTaskDto,
  parseTask,
  parseTaskList,
  parseUpdateTaskDto,
  type Task,
  type TaskClient,
  type TaskFilter,
  type UpdateTaskDto,
  validateTaskId,
} from "../core/index.ts";
import {
  BodyLimitError,
  MAX_RESPONSE_BYTES,
  parseResponseJson,
  readBoundedStream,
} from "../core/json.ts";

export interface FetchClientOptions {
  readonly baseUrl: string | URL;
  readonly timeoutMs?: number;
  readonly fetch?: FetchFunction;
  readonly maximumResponseBytes?: number;
}

export type FetchFunction = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

const ERROR_CODES = new Set<ApiErrorCode>([
  "invalid_json",
  "not_found",
  "method_not_allowed",
  "validation_error",
  "internal_error",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireJsonContentType(response: Response): void {
  const mediaType = response.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (mediaType !== "application/json") {
    throw new ClientProtocolError("response content type must be application/json");
  }
}

function parseErrorDetails(value: unknown): ErrorDetails | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    throw new ClientProtocolError("API error details must be an object");
  }
  const details: Record<string, string | number | boolean | null> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (
      entry !== null &&
      typeof entry !== "string" &&
      typeof entry !== "number" &&
      typeof entry !== "boolean"
    ) {
      throw new ClientProtocolError("API error details contain an invalid value");
    }
    details[key] = entry;
  }
  return Object.freeze(details);
}

function parseApiError(status: number, value: unknown): ApiError {
  if (!isRecord(value) || Object.keys(value).length !== 1 || !isRecord(value.error)) {
    throw new ClientProtocolError("error response has an unexpected shape");
  }
  const error = value.error;
  const keys = Object.keys(error);
  if (
    !keys.includes("code") ||
    !keys.includes("message") ||
    keys.some((key) => key !== "code" && key !== "message" && key !== "details")
  ) {
    throw new ClientProtocolError("error response has an unexpected shape");
  }
  if (
    typeof error.code !== "string" ||
    !ERROR_CODES.has(error.code as ApiErrorCode) ||
    typeof error.message !== "string" ||
    error.message.length === 0
  ) {
    throw new ClientProtocolError("error response contains invalid fields");
  }
  const expectedCode = new Map<number, ApiErrorCode>([
    [400, "invalid_json"],
    [404, "not_found"],
    [405, "method_not_allowed"],
    [422, "validation_error"],
    [500, "internal_error"],
  ]).get(status);
  if (expectedCode === undefined || error.code !== expectedCode) {
    throw new ClientProtocolError("error status and code do not match the contract");
  }
  return new ApiError(
    status,
    error.code as ApiErrorCode,
    error.message,
    parseErrorDetails(error.details),
  );
}

function validateBaseUrl(value: string | URL): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch (error) {
    throw new ClientProtocolError("base URL is invalid", error);
  }
  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new ClientProtocolError("base URL must be an HTTP origin or path");
  }
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url;
}

export class FetchTaskClient implements TaskClient {
  readonly #baseUrl: URL;
  readonly #timeoutMs: number;
  readonly #fetch: FetchFunction;
  readonly #maximumResponseBytes: number;

  constructor(options: FetchClientOptions) {
    this.#baseUrl = validateBaseUrl(options.baseUrl);
    this.#timeoutMs = options.timeoutMs ?? 5_000;
    this.#fetch = options.fetch ?? fetch;
    this.#maximumResponseBytes = options.maximumResponseBytes ?? MAX_RESPONSE_BYTES;
    if (!Number.isFinite(this.#timeoutMs) || this.#timeoutMs <= 0) {
      throw new ClientProtocolError("timeout must be a positive finite value");
    }
    if (
      !Number.isSafeInteger(this.#maximumResponseBytes) ||
      this.#maximumResponseBytes <= 0
    ) {
      throw new ClientProtocolError("maximum response size must be positive");
    }
  }

  async #request(
    method: string,
    path: string,
    expectedStatus: number,
    body?: unknown,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.#timeoutMs);
    try {
      const headers = new Headers();
      let encodedBody: string | undefined;
      if (body !== undefined) {
        headers.set("content-type", "application/json");
        encodedBody = JSON.stringify(body);
      }
      const init: RequestInit = {
        method,
        headers,
        signal: controller.signal,
        redirect: "manual",
      };
      if (encodedBody !== undefined) init.body = encodedBody;
      const response = await this.#fetch(new URL(path, this.#baseUrl), init);
      let bytes: Uint8Array;
      try {
        bytes = await readBoundedStream(response.body, this.#maximumResponseBytes);
      } catch (error) {
        if (error instanceof BodyLimitError) {
          throw new ClientProtocolError("response body exceeds the size limit", error);
        }
        if (controller.signal.aborted) {
          throw new ClientTransportError("request timed out", error);
        }
        throw new ClientTransportError("response body stream failed", error);
      }
      if (response.status !== expectedStatus) {
        requireJsonContentType(response);
        throw parseApiError(response.status, parseResponseJson(bytes));
      }
      if (expectedStatus === 204) {
        if (bytes.byteLength !== 0) {
          throw new ClientProtocolError("204 response must have an empty body");
        }
        return undefined;
      }
      requireJsonContentType(response);
      return parseResponseJson(bytes);
    } catch (error) {
      if (
        error instanceof ApiError ||
        error instanceof ClientProtocolError ||
        error instanceof ClientTransportError
      ) {
        throw error;
      }
      if (controller.signal.aborted) {
        throw new ClientTransportError("request timed out", error);
      }
      throw new ClientTransportError("request failed", error);
    } finally {
      clearTimeout(timer);
    }
  }

  async create(input: CreateTaskDto): Promise<Task> {
    const dto = parseCreateTaskDto(input);
    return parseTask(await this.#request("POST", "tasks", 201, dto));
  }

  async list(filter: TaskFilter): Promise<readonly Task[]> {
    const query = new URLSearchParams();
    if (filter.completed !== undefined) {
      if (typeof filter.completed !== "boolean") {
        throw new ClientProtocolError("completed filter must be a boolean");
      }
      query.set("completed", String(filter.completed));
    }
    return parseTaskList(
      await this.#request(
        "GET",
        query.size === 0 ? "tasks" : `tasks?${query.toString()}`,
        200,
      ),
    );
  }

  async get(id: number): Promise<Task> {
    return parseTask(await this.#request("GET", `tasks/${validateTaskId(id)}`, 200));
  }

  async update(id: number, input: UpdateTaskDto): Promise<Task> {
    const dto = parseUpdateTaskDto(input);
    return parseTask(
      await this.#request("PATCH", `tasks/${validateTaskId(id)}`, 200, dto),
    );
  }

  async delete(id: number): Promise<void> {
    await this.#request("DELETE", `tasks/${validateTaskId(id)}`, 204);
  }
}
