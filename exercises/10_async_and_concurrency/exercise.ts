// Contract: apply transform to every input, preserve the input order in the
// returned array, reject invalid limits, and never have more than `limit`
// transforms awaiting at the same time. Do not start all work at once.
export async function mapWithLimit<T, R>(
  _values: readonly T[],
  _limit: number,
  _transform: (value: T) => Promise<R>,
): Promise<R[]> {
  throw new Error("TODO: implement bounded mapping");
}

export interface MeasuredResult<T> {
  readonly value: T;
  readonly elapsedMilliseconds: number;
}

// CONTRACT: measure one async operation with a monotonic clock. Preserve the
// operation's rejection and reject invalid or decreasing clock readings.
export async function measureDuration<T>(
  _operation: () => Promise<T>,
  _now: () => number = () => performance.now(),
): Promise<MeasuredResult<T>> {
  throw new Error("TODO: measure the async operation");
}
