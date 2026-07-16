import {
  createRelayHttpHandler,
  deferred,
  EventRelay,
  InMemoryEventLog,
  type RelayHttpHandler,
  type ServeOptions,
} from "../../solution/core/index.ts";
import { assert, deepEqual, equal, validAlert } from "./testing.ts";

export type ServeRelay = (
  options: ServeOptions,
  handler: RelayHttpHandler,
  signal: AbortSignal,
) => Promise<void>;

export async function runM4HttpContract(serve: ServeRelay): Promise<void> {
  const relay = new EventRelay(new InMemoryEventLog(1), [], 2);
  const controller = new AbortController();
  const listening = deferred<number>();
  const handler = createRelayHttpHandler(relay);
  const running = serve(
    {
      host: "127.0.0.1",
      port: 0,
      onListen: (port) => listening.resolve(port),
    },
    handler,
    controller.signal,
  );
  const port = await listening.promise;
  const base = `http://127.0.0.1:${port}`;
  try {
    const health = await fetch(`${base}/healthz`);
    equal(health.status, 200, "health endpoint must be available");
    deepEqual(await health.json(), { status: "ok" }, "health response must be stable");

    const created = await fetch(`${base}/v1/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validAlert()),
    });
    equal(created.status, 201, "valid HTTP event must be created");
    const stored = await created.json();
    assert(
      typeof stored === "object" &&
        stored !== null &&
        "sequence" in stored &&
        stored.sequence === 1,
      "created event must include its assigned sequence",
    );
    equal(
      (
        await fetch(`${base}/v1/events`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...validAlert(), id: "evt-full" }),
        })
      ).status,
      503,
      "full logs must map to HTTP 503",
    );
    const invalidEvent = await fetch(`${base}/v1/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...validAlert(), severity: "critical" }),
    });
    equal(invalidEvent.status, 400, "invalid events must map to HTTP 400");
    const invalidBody = await invalidEvent.json();
    assert(
      typeof invalidBody === "object" &&
        invalidBody !== null &&
        "error" in invalidBody &&
        typeof invalidBody.error === "object" &&
        invalidBody.error !== null &&
        "details" in invalidBody.error &&
        typeof invalidBody.error.details === "object" &&
        invalidBody.error.details !== null &&
        "path" in invalidBody.error.details &&
        invalidBody.error.details.path === "severity",
      "invalid event response must expose the validated path",
    );

    const replay = await fetch(`${base}/v1/events?kind=alert&after=0&limit=1`);
    equal(replay.status, 200, "query endpoint must succeed");
    const replayBody = await replay.json();
    assert(
      typeof replayBody === "object" &&
        replayBody !== null &&
        "events" in replayBody &&
        Array.isArray(replayBody.events) &&
        replayBody.events.length === 1,
      "query endpoint must return filtered events",
    );

    equal(
      (await fetch(`${base}/v1/events`, { method: "DELETE" })).status,
      405,
      "known route with wrong method must return 405",
    );
    equal(
      (
        await fetch(`${base}/v1/events`, {
          method: "POST",
          headers: { "content-type": "text/plain" },
          body: "{}",
        })
      ).status,
      415,
      "wrong media type must return 415",
    );
    equal(
      (
        await fetch(`${base}/v1/events`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "x".repeat(64 * 1024 + 1),
        })
      ).status,
      413,
      "streamed body over 64 KiB must return 413",
    );
    equal((await fetch(`${base}/missing`)).status, 404, "unknown path must return 404");
    equal(
      (await fetch(`${base}/v1/events?limit=0`)).status,
      400,
      "invalid query bounds must return 400",
    );
    equal(
      (await fetch(`${base}/v1/events?limit=1&limit=2`)).status,
      400,
      "duplicate query values must return 400",
    );
    equal(
      (await fetch(`${base}/v1/events?unknown=1`)).status,
      400,
      "unknown query values must return 400",
    );
    equal(
      (await fetch(`${base}/healthz?unknown=1`)).status,
      400,
      "health query values must return 400",
    );
    equal(
      (
        await fetch(`${base}/v1/events?unknown=1`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(validAlert()),
        })
      ).status,
      400,
      "ingest query values must return 400",
    );
    equal(
      (
        await handler({
          method: "POST",
          url: "/healthz",
          headers: { get: () => null },
          body: null,
        })
      ).status,
      405,
      "health must advertise GET only",
    );
    equal(
      (
        await handler({
          method: "POST",
          url: "/v1/events",
          headers: {
            get: (name) =>
              name === "content-type"
                ? "application/json"
                : name === "content-length"
                  ? "invalid"
                  : null,
          },
          body: null,
        })
      ).status,
      400,
      "malformed content length must return 400",
    );
    equal(
      (
        await handler({
          method: "POST",
          url: "/v1/events",
          headers: {
            get: (name) =>
              name === "content-type"
                ? "application/json"
                : name === "content-length"
                  ? String(64 * 1024 + 1)
                  : null,
          },
          body: null,
        })
      ).status,
      413,
      "declared oversized body must return 413 before reading",
    );
    equal(
      (
        await handler({
          method: "POST",
          url: "/v1/events",
          headers: {
            get: (name) => (name === "content-type" ? "application/json" : null),
          },
          body: null,
        })
      ).status,
      400,
      "missing body must return 400",
    );
    const invalidUtf8 = async function* () {
      yield new Uint8Array([0xff]);
    };
    equal(
      (
        await handler({
          method: "POST",
          url: "/v1/events",
          headers: {
            get: (name) => (name === "content-type" ? "application/json" : null),
          },
          body: invalidUtf8(),
        })
      ).status,
      400,
      "invalid UTF-8 must return 400",
    );
    relay.stopAccepting();
    const shuttingDown = await handler({
      method: "GET",
      url: "/healthz",
      headers: { get: () => null },
      body: null,
    });
    equal(shuttingDown.status, 503, "health must fail once shutdown begins");
  } finally {
    relay.stopAccepting();
    controller.abort();
    await running;
    await relay.close();
  }
}
