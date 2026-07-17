export const TITLE_MAX_CHARACTERS = 120;

export type ErrorDetailValue = string | number | boolean | null;
export type ErrorDetails = Readonly<Record<string, ErrorDetailValue>>;

export type ApiErrorCode =
  | "invalid_json"
  | "not_found"
  | "method_not_allowed"
  | "validation_error"
  | "internal_error";

export class ValidationError extends Error {
  readonly field: string | undefined;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
  }
}

export class TaskNotFoundError extends Error {
  readonly id: number;

  constructor(id: number) {
    super(`task ${id} was not found`);
    this.name = "TaskNotFoundError";
    this.id = id;
  }
}

export class StorageError extends Error {
  readonly operation: string;

  constructor(operation: string, message: string, cause?: unknown) {
    super(`${operation}: ${message}`, cause === undefined ? undefined : { cause });
    this.name = "StorageError";
    this.operation = operation;
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details: ErrorDetails | undefined;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    details?: ErrorDetails,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ClientProtocolError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ClientProtocolError";
  }
}

export class ClientTransportError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "ClientTransportError";
  }
}

export class LifecycleError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "LifecycleError";
  }
}

export class IncompleteProjectError extends Error {
  constructor(area: string) {
    super(`starter incomplete: implement ${area}`);
    this.name = "IncompleteProjectError";
  }
}

export interface Task {
  readonly id: number;
  readonly title: string;
  readonly completed: boolean;
}

export interface CreateTaskDto {
  readonly title: string;
}

export interface UpdateTaskDto {
  readonly title?: string;
  readonly completed?: boolean;
}

export interface TaskFilter {
  readonly completed?: boolean;
}

export interface TaskRepository {
  create(title: string): Promise<Task>;
  list(filter: TaskFilter): Promise<readonly Task[]>;
  get(id: number): Promise<Task>;
  update(id: number, update: UpdateTaskDto): Promise<Task>;
  delete(id: number): Promise<void>;
  close(): Promise<void>;
}

export interface TaskClient {
  create(input: CreateTaskDto): Promise<Task>;
  list(filter: TaskFilter): Promise<readonly Task[]>;
  get(id: number): Promise<Task>;
  update(id: number, input: UpdateTaskDto): Promise<Task>;
  delete(id: number): Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new ValidationError(`unknown property: ${key}`, key);
    }
  }
}

export function validateTitle(value: unknown): string {
  if (typeof value !== "string") {
    throw new ValidationError("title must be a string", "title");
  }
  const title = value.trim();
  const length = [...title].length;
  if (length < 1 || length > TITLE_MAX_CHARACTERS) {
    throw new ValidationError(
      "title must contain between 1 and 120 characters",
      "title",
    );
  }
  if (
    [...title].some((character) => {
      const codePoint = character.codePointAt(0);
      return (
        codePoint !== undefined &&
        (codePoint <= 0x1f ||
          (codePoint >= 0x7f && codePoint <= 0x9f) ||
          (codePoint >= 0xd800 && codePoint <= 0xdfff))
      );
    })
  ) {
    throw new ValidationError(
      "title must occupy one line and contain no control characters",
      "title",
    );
  }
  return title;
}

export function validateTaskId(value: unknown): number {
  let id: number;
  if (typeof value === "number") {
    id = value;
  } else if (typeof value === "string" && /^[0-9]+$/u.test(value)) {
    id = Number(value);
  } else {
    throw new ValidationError("id must be a positive integer", "id");
  }
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ValidationError("id must be a positive integer", "id");
  }
  return id;
}

export function parseCreateTaskDto(value: unknown): CreateTaskDto {
  if (!isRecord(value)) {
    throw new ValidationError("request body must be an object");
  }
  assertExactKeys(value, new Set(["title"]));
  if (!Object.hasOwn(value, "title")) {
    throw new ValidationError("title is required", "title");
  }
  return Object.freeze({ title: validateTitle(value.title) });
}

export function parseUpdateTaskDto(value: unknown): UpdateTaskDto {
  if (!isRecord(value)) {
    throw new ValidationError("request body must be an object");
  }
  assertExactKeys(value, new Set(["title", "completed"]));
  const hasTitle = Object.hasOwn(value, "title");
  const hasCompleted = Object.hasOwn(value, "completed");
  if (!hasTitle && !hasCompleted) {
    throw new ValidationError("update must contain title or completed");
  }
  const result: { title?: string; completed?: boolean } = {};
  if (hasTitle) {
    result.title = validateTitle(value.title);
  }
  if (hasCompleted) {
    if (typeof value.completed !== "boolean") {
      throw new ValidationError("completed must be a boolean", "completed");
    }
    result.completed = value.completed;
  }
  return Object.freeze(result);
}

export function parseTaskFilter(value: unknown): TaskFilter {
  if (value === undefined) {
    return Object.freeze({});
  }
  if (typeof value !== "boolean") {
    throw new ValidationError("completed must be true or false", "completed");
  }
  return Object.freeze({ completed: value });
}

export function parseTask(value: unknown): Task {
  if (!isRecord(value)) {
    throw new ClientProtocolError("response task must be an object");
  }
  const keys = Object.keys(value);
  if (
    keys.length !== 3 ||
    !keys.includes("id") ||
    !keys.includes("title") ||
    !keys.includes("completed")
  ) {
    throw new ClientProtocolError("response task has an unexpected shape");
  }
  if (typeof value.id !== "number") {
    throw new ClientProtocolError("response task id must be a JSON number");
  }
  let id: number;
  let title: string;
  try {
    id = validateTaskId(value.id);
    title = validateTitle(value.title);
  } catch (error) {
    throw new ClientProtocolError("response task contains invalid fields", error);
  }
  if (typeof value.completed !== "boolean") {
    throw new ClientProtocolError("response task contains invalid fields");
  }
  if (title !== value.title) {
    throw new ClientProtocolError("response task title is not canonical");
  }
  return Object.freeze({ id, title, completed: value.completed });
}

export function parseTaskList(value: unknown): readonly Task[] {
  if (!Array.isArray(value)) {
    throw new ClientProtocolError("response must be a task array");
  }
  const tasks = value.map(parseTask);
  for (let index = 1; index < tasks.length; index += 1) {
    const previous = tasks[index - 1];
    const current = tasks[index];
    if (previous === undefined || current === undefined || previous.id >= current.id) {
      throw new ClientProtocolError("response tasks must be ordered by id");
    }
  }
  return Object.freeze(tasks);
}

export class TaskService {
  readonly #repository: TaskRepository;

  constructor(repository: TaskRepository) {
    this.#repository = repository;
  }

  create(input: unknown): Promise<Task> {
    const dto = parseCreateTaskDto(input);
    return this.#repository.create(dto.title);
  }

  list(completed?: unknown): Promise<readonly Task[]> {
    return this.#repository.list(parseTaskFilter(completed));
  }

  get(id: unknown): Promise<Task> {
    return this.#repository.get(validateTaskId(id));
  }

  update(id: unknown, input: unknown): Promise<Task> {
    return this.#repository.update(validateTaskId(id), parseUpdateTaskDto(input));
  }

  delete(id: unknown): Promise<void> {
    return this.#repository.delete(validateTaskId(id));
  }
}
