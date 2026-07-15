function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }

    const onAbort = (): void => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function mapWithLimit<T, R>(
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

  // A fixed worker pool shares one cursor, so at most `limit` transforms run at once.
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

  const workerCount = Math.min(limit, values.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

const controller = new AbortController();
const results = await mapWithLimit([1, 2, 3, 4], 2, async (value) => {
  await delay(5, controller.signal);
  return value * value;
});

console.log(results);

const cancellation = new AbortController();
const cancelledDelay = delay(100, cancellation.signal);
cancellation.abort(new Error("delay cancelled"));

try {
  await cancelledDelay;
} catch (error: unknown) {
  console.log(error instanceof Error ? error.message : String(error));
}
