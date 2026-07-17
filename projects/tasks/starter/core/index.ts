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

function incomplete(area: string): never {
  throw new IncompleteProjectError(area);
}

export function validateTitle(_value: unknown): string {
  return incomplete("core title validation");
}
export function validateTaskId(_value: unknown): number {
  return incomplete("core id validation");
}
export function parseCreateTaskDto(_value: unknown): CreateTaskDto {
  return incomplete("create DTO validation");
}
export function parseUpdateTaskDto(_value: unknown): UpdateTaskDto {
  return incomplete("update DTO validation");
}
export function parseTaskFilter(_value: unknown): TaskFilter {
  return incomplete("filter validation");
}
export function parseTask(_value: unknown): Task {
  return incomplete("Task response validation");
}
export function parseTaskList(_value: unknown): readonly Task[] {
  return incomplete("Task list response validation");
}

export class TaskService {
  constructor(_repository: TaskRepository) {}
  create(_input: unknown): Promise<Task> {
    return Promise.reject(new IncompleteProjectError("Task service create"));
  }
  list(_completed?: unknown): Promise<readonly Task[]> {
    return Promise.reject(new IncompleteProjectError("Task service list"));
  }
  get(_id: unknown): Promise<Task> {
    return Promise.reject(new IncompleteProjectError("Task service get"));
  }
  update(_id: unknown, _input: unknown): Promise<Task> {
    return Promise.reject(new IncompleteProjectError("Task service update"));
  }
  delete(_id: unknown): Promise<void> {
    return Promise.reject(new IncompleteProjectError("Task service delete"));
  }
}
