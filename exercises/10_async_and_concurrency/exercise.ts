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
