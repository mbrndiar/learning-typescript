import { IncompleteProjectError, type Task } from "../core/index.ts";

export interface MarkdownState {
  readonly nextId: number;
  readonly tasks: readonly Task[];
}
export function initialMarkdownState(): MarkdownState {
  throw new IncompleteProjectError("Markdown initial state");
}
export function parseMarkdownDocument(_source: string): MarkdownState {
  throw new IncompleteProjectError("Markdown parsing");
}
export function serializeMarkdownDocument(_state: MarkdownState): string {
  throw new IncompleteProjectError("Markdown serialization");
}
export class SerialExecutor {
  run<T>(_operation: () => Promise<T>): Promise<T> {
    return Promise.reject(new IncompleteProjectError("serialized writes"));
  }
}
