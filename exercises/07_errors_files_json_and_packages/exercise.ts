export interface Task {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
}

export function parseTasks(_value: unknown): Task[] {
  // TODO: validate the array and every task without using `any`.
  return [];
}
