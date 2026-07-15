// CONTRACT: call operation at most attempts times, retrying only when the
// supplied predicate approves the caught value, then resolve or rethrow.
export async function retry<T>(
  operation: () => Promise<T>,
  attempts: number,
  shouldRetry: (error: unknown) => boolean,
): Promise<T> {
  // Validate before the first call so "zero attempts" cannot silently skip the
  // operation or hang a caller waiting for a result.
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new RangeError("attempts must be a positive integer");
  }

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation();
    } catch (error: unknown) {
      if (attempt === attempts || !shouldRetry(error)) {
        // Rethrowing the original value preserves its type, stack, and object
        // identity for callers that inspect failures.
        throw error;
      }
    }
  }
}
