// CONTRACT: call operation at most attempts times, retrying only when the
// supplied predicate approves the caught value, then resolve or rethrow.
export async function retry<T>(
  _operation: () => Promise<T>,
  _attempts: number,
  _shouldRetry: (error: unknown) => boolean,
): Promise<T> {
  throw new Error("TODO: implement retry");
}
