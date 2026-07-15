import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { channel } from "node:diagnostics_channel";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { describe, test } from "node:test";

interface CalculationDiagnostic {
  readonly count: number;
  readonly total: number;
}

const calculationChannel = channel("learning-typescript:calculation");
let measurementId = 0;

function measuredTotal(values: readonly number[]): number {
  measurementId += 1;
  const start = `calculation:start:${measurementId}`;
  const end = `calculation:end:${measurementId}`;
  performance.mark(start);

  const total = values.reduce((sum, value) => sum + value, 0);
  calculationChannel.publish({
    count: values.length,
    total,
  } satisfies CalculationDiagnostic);

  performance.mark(end);
  const measure = performance.measure(`calculation:${measurementId}`, start, end);
  performance.clearMarks(start);
  performance.clearMarks(end);
  performance.clearMeasures(measure.name);
  return total;
}

describe("advanced Node runtime checks", () => {
  test("diagnostics are opt-in and performance measurements are monotonic", (t) => {
    const diagnostics: unknown[] = [];
    const subscriber = (message: unknown): void => {
      diagnostics.push(message);
    };
    calculationChannel.subscribe(subscriber);

    try {
      assert.equal(measuredTotal([2, 3, 5]), 10);
      assert.deepEqual(diagnostics, [{ count: 3, total: 10 }]);
      t.diagnostic("a diagnostics channel transports data but does not store logs");
    } finally {
      calculationChannel.unsubscribe(subscriber);
    }
  });

  test("test context mocks record calls", (t) => {
    const double = t.mock.fn((value: number) => value * 2);
    assert.equal(double(4), 8);
    assert.equal(double.mock.callCount(), 1);
    assert.deepEqual(double.mock.calls[0]?.arguments, [4]);
  });

  test("npm pack dry-run exposes the consumer boundary", async (t) => {
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    const packageRoot = join(import.meta.dirname, "../..");
    const packed = spawnSync(npm, ["pack", "--dry-run", "--json", "--ignore-scripts"], {
      cwd: packageRoot,
      encoding: "utf8",
    });

    assert.equal(packed.status, 0, packed.stderr);
    const report: unknown = JSON.parse(packed.stdout);

    await t.test("the dry-run reports package metadata and files", () => {
      const entry: unknown = Array.isArray(report)
        ? report[0]
        : typeof report === "object" && report !== null
          ? (report as Record<string, unknown>)["learning-typescript-course"]
          : undefined;
      assert.ok(typeof entry === "object" && entry !== null);
      const record = entry as Record<string, unknown>;
      assert.equal(record.name, "learning-typescript-course");
      assert.ok(Array.isArray(record.files));
      assert.ok(
        record.files.some(
          (file) =>
            typeof file === "object" &&
            file !== null &&
            (file as Record<string, unknown>).path === "package.json",
        ),
      );
    });

    t.diagnostic(
      "npm pack --dry-run inspected distribution without creating a tarball",
    );
  });
});
