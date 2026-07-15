export async function mapWithLimit<T, R>(
  values: readonly T[],
  limit: number,
  transform: (value: T) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("limit must be a positive integer");
  }

  const results = new Array<R>(values.length);
  const pending = values.map((value, index) => ({ index, value }));
  let nextPosition = 0;

  async function worker(): Promise<void> {
    while (true) {
      const entry = pending[nextPosition];
      if (entry === undefined) {
        return;
      }
      nextPosition += 1;
      results[entry.index] = await transform(entry.value);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, () => worker()),
  );
  return results;
}
