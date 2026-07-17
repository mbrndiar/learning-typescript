import { IncompleteProjectError, type TaskService } from "./index.ts";

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

export function dispatchHttp(
  _service: TaskService,
  _request: HttpRequest,
  _logError?: ErrorLogger,
): Promise<HttpResponse> {
  return Promise.reject(new IncompleteProjectError("shared HTTP dispatch"));
}
