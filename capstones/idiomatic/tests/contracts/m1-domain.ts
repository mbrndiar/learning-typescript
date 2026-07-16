import {
  eventMatches,
  InMemoryEventLog,
  normalizeReplayQuery,
  parseEvent,
  type IncomingEvent,
} from "../../solution/core/index.ts";
import {
  assert,
  collect,
  deepEqual,
  equal,
  rejects,
  validAlert,
  validMetric,
} from "./testing.ts";

export async function runM1DomainContract(): Promise<void> {
  const metric = parseEvent(validMetric());
  assert(metric.ok, "valid metric must parse");
  deepEqual(
    metric.event,
    {
      kind: "metric",
      id: "evt-001",
      source: "checkout",
      observedAt: "2026-07-16T08:00:00.000Z",
      name: "request.duration_ms",
      value: 125,
      tags: { region: "eu", route: "/cart" },
    },
    "metric normalization must be deterministic",
  );

  const alert = parseEvent(validAlert());
  assert(alert.ok, "valid alert must parse");
  assert(alert.event.kind === "alert", "alert variant must be preserved");
  equal(
    alert.event.observedAt,
    "2026-07-16T08:01:00.000Z",
    "offset timestamp must normalize to UTC milliseconds",
  );
  equal(alert.event.message, "catalog request timed out", "message must trim");

  const unicode = parseEvent({
    ...validAlert("unicode"),
    source: "cafe\u0301",
    message: "e\u0301 remains decomposed",
  });
  assert(unicode.ok, "Unicode event must parse");
  equal(unicode.event.source, "cafe\u0301", "Unicode must not normalize");

  const negativeZero = parseEvent({ ...validMetric("zero"), value: -0 });
  assert(negativeZero.ok, "-0 metric must parse");
  assert(negativeZero.event.kind === "metric", "metric variant must be preserved");
  assert(!Object.is(negativeZero.event.value, -0), "-0 must normalize to 0");

  for (const [value, path] of [
    [null, ""],
    [[], ""],
    [{}, "kind"],
    [{ ...validMetric(), id: "-bad" }, "id"],
    [{ ...validMetric(), source: 1 }, "source"],
    [{ ...validMetric(), source: " \t " }, "source"],
    [{ ...validMetric(), source: "checkout\n" }, "source"],
    [{ ...validMetric(), source: "bad\u0000source" }, "source"],
    [{ ...validMetric(), extra: true }, "extra"],
    [{ ...validMetric(), observedAt: "not-a-time" }, "observedAt"],
    [{ ...validMetric(), observedAt: "2026-02-30T00:00:00Z" }, "observedAt"],
    [{ ...validMetric(), observedAt: "2026-01-01T24:00:00Z" }, "observedAt"],
    [{ ...validMetric(), observedAt: "2026-01-01T00:00:00+24:00" }, "observedAt"],
    [{ ...validMetric(), name: "_bad" }, "name"],
    [{ ...validMetric(), value: Number.POSITIVE_INFINITY }, "value"],
    [{ ...validMetric(), tags: [] }, "tags"],
    [{ ...validMetric(), tags: undefined }, "tags"],
    [
      {
        ...validMetric(),
        tags: Object.fromEntries(
          Array.from({ length: 17 }, (_, index) => [`tag${index}`, "x"]),
        ),
      },
      "tags",
    ],
    [{ ...validMetric(), tags: { "1bad": "x" } }, "tags.1bad"],
    [{ ...validMetric(), tags: { valid: "bad\u0000value" } }, "tags.valid"],
    [{ ...validAlert(), severity: "critical" }, "severity"],
    [{ ...validAlert(), code: "lowercase" }, "code"],
    [{ ...validAlert(), message: 1 }, "message"],
    [{ ...validAlert(), message: " \n " }, "message"],
    [{ ...validAlert(), message: "message\n" }, "message"],
  ] as const) {
    const parsed = parseEvent(value);
    assert(!parsed.ok, `invalid value at ${path} must fail`);
    equal(parsed.error.path ?? "", path, "error path must identify the boundary");
  }
  const accessorEvent = { ...validMetric("accessor") };
  Object.defineProperty(accessorEvent, "name", {
    enumerable: true,
    get() {
      throw new Error("getter must not execute");
    },
  });
  equal(
    parseEvent(accessorEvent).ok,
    false,
    "accessor properties must fail without executing user code",
  );
  const symbolEvent = { ...validMetric("symbol") };
  Object.defineProperty(symbolEvent, Symbol("extra"), { value: true });
  equal(
    parseEvent(symbolEvent).ok,
    false,
    "symbol properties must be rejected as unknown",
  );
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();
  equal(
    parseEvent(revoked.proxy).ok,
    false,
    "uninspectable proxies must return a parse failure rather than throw",
  );

  const log = new InMemoryEventLog(2);
  const first = await log.append(metric.event);
  const second = await log.append(alert.event);
  equal(first.sequence, 1, "first sequence must be one");
  equal(second.sequence, 2, "sequences must be contiguous");
  deepEqual(
    await collect(log.replay({ after: 0, kind: "alert", source: "checkout" })),
    [second],
    "replay filters must combine with AND",
  );
  equal(
    eventMatches(second, { after: 1, kind: "alert" }),
    true,
    "eventMatches must apply normalized replay criteria",
  );
  deepEqual(
    normalizeReplayQuery({}),
    { after: 0, limit: 100 },
    "replay query defaults must be deterministic",
  );
  for (const query of [{ after: -1 }, { limit: 0 }, { limit: 1_001 }, { source: "" }]) {
    let rejected = false;
    try {
      normalizeReplayQuery(query);
    } catch {
      rejected = true;
    }
    equal(rejected, true, "invalid replay query must fail");
  }
  await rejects(
    () => log.append(metric.event),
    "log_full",
    "capacity must be enforced",
  );
  await log.close();

  const variants: readonly IncomingEvent[] = [metric.event, alert.event];
  equal(variants.length, 2, "both closed event variants must remain represented");
}
