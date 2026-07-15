// mapWithLimit applies transform to every value while preserving input order
// and bounding concurrency. A rejected transform rejects the returned promise.
export async function mapWithLimit<T, R>(
  values: readonly T[],
  limit: number,
  transform: (value: T) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("limit must be a positive integer");
  }

  // Results are written by original index, so faster later tasks cannot
  // reorder the array the caller receives.
  const results = new Array<R>(values.length);
  const pending = values.map((value, index) => ({ index, value }));
  let nextPosition = 0;

  // Workers share a cursor instead of each receiving a pre-sliced batch. That
  // keeps all workers busy even when individual transforms take different
  // amounts of time.
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

  // Promise.all gives the desired all-or-nothing contract and observes every
  // worker promise, so failures are reported through this function.
  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, () => worker()),
  );
  return results;
}
