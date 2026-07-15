export async function retry<T>(
  operation: () => Promise<T>,
  attempts: number,
  shouldRetry: (error: unknown) => boolean,
): Promise<T> {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new RangeError("attempts must be a positive integer");
  }

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation();
    } catch (error: unknown) {
      if (attempt === attempts || !shouldRetry(error)) {
        throw error;
      }
    }
  }
}
