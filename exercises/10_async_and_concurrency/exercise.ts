export async function mapWithLimit<T, R>(
  _values: readonly T[],
  _limit: number,
  _transform: (value: T) => Promise<R>,
): Promise<R[]> {
  throw new Error("TODO: implement bounded mapping");
}
