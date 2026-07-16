export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function equal<T>(actual: T, expected: T, message: string): void {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `${message}: expected ${String(expected)}, received ${String(actual)}`,
    );
  }
}

export function deepEqual(actual: unknown, expected: unknown, message: string): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${message}:\nexpected ${expectedJson}\nreceived ${actualJson}`);
  }
}

export async function rejects(
  operation: () => Promise<unknown>,
  code: string,
  message: string,
): Promise<void> {
  try {
    await operation();
  } catch (error: unknown) {
    assert(
      typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === code,
      `${message}: unexpected rejection`,
    );
    return;
  }
  throw new Error(`${message}: operation unexpectedly succeeded`);
}

export function validMetric(id = "evt-001") {
  return {
    kind: "metric" as const,
    id,
    source: "checkout",
    observedAt: "2026-07-16T08:00:00Z",
    name: "request.duration_ms",
    value: 125,
    tags: { route: "/cart", region: "eu" },
  };
}

export function validAlert(id = "evt-002") {
  return {
    kind: "alert" as const,
    id,
    source: "checkout",
    observedAt: "2026-07-16T10:01:00+02:00",
    code: "UPSTREAM_TIMEOUT",
    severity: "warning" as const,
    message: " catalog request timed out ",
  };
}

export async function collect<T>(values: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const value of values) {
    result.push(value);
  }
  return result;
}
