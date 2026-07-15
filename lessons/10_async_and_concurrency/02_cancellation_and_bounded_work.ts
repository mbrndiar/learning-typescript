// delay is a cancel-aware timer: callers may await it like any other promise,
// but an AbortSignal can end the wait early and release the timer promptly.
function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }

    const onAbort = (): void => {
      // Cancellation is cooperative: the operation that owns the resource must
      // stop the timer and reject, or the signal by itself changes nothing.
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

// mapWithLimit preserves input order while bounding the amount of work in
// flight. The limit protects memory, sockets, rate limits, or other resources
// that an unbounded Promise.all over every value could exhaust.
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

  // A fixed worker pool shares one cursor, so at most `limit` transforms run
  // at once even if the input list is much larger.
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
  // Promise.all is right for an all-or-nothing mapping: the first rejection
  // rejects the returned promise, while every worker promise is still observed.
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

const controller = new AbortController();
// Passing the same signal through layers lets the caller cancel the delay
// without knowing that mapWithLimit currently implements work with timers.
const results = await mapWithLimit([1, 2, 3, 4], 2, async (value) => {
  await delay(5, controller.signal);
  return value * value;
});

console.log(results);

const cancellation = new AbortController();
const cancelledDelay = delay(100, cancellation.signal);
// Abort after the operation has started to demonstrate the lifecycle: the
// listener runs, the timer is cleared, and awaiting the promise observes the
// abort reason instead of hanging until the original timeout.
cancellation.abort(new Error("delay cancelled"));

try {
  await cancelledDelay;
} catch (error: unknown) {
  console.log(error instanceof Error ? error.message : String(error));
}
