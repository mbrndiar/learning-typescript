// Deno's test runner checks for leaked async operations, resources, and exits
// by default. The examples keep lifecycle explicit so sanitizer failures point
// to the code under test, not the test scaffolding.
interface Hooks {
  readonly beforeEach?: () => void | Promise<void>;
  readonly afterEach?: () => void | Promise<void>;
}

// Hook cleanup belongs in finally so a failed body cannot leak state into the
// next step.
export async function withHooks(
  hooks: Hooks,
  body: () => void | Promise<void>,
): Promise<void> {
  await hooks.beforeEach?.();
  try {
    await body();
  } finally {
    await hooks.afterEach?.();
  }
}

function assertEquals<T>(actual: T, expected: T): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

// Nested steps show arrange and assert as separate lifecycle phases; if a
// step leaves work open, sanitizers fail the owning test.
Deno.test({
  name: "Deno.test supports nested steps and explicit lifecycle hooks",
  sanitizeOps: true,
  sanitizeResources: true,
  sanitizeExit: true,
  fn: async (test) => {
    const events: string[] = [];

    await test.step("arrange and act", async () => {
      await withHooks(
        {
          beforeEach: () => {
            events.push("before");
          },
          afterEach: () => {
            events.push("after");
          },
        },
        () => {
          events.push("body");
        },
      );
    });

    await test.step("assert", () => {
      assertEquals(events.join(","), "before,body,after");
    });
  },
});

// This test removes ambient permissions to prove the code under test does not
// depend on the developer's command-line grants.
Deno.test({
  name: "per-test permissions can remove ambient authority",
  permissions: { read: false, write: false, net: false, env: false, run: false },
  fn: async () => {
    const status = await Deno.permissions.query({ name: "env", variable: "HOME" });
    if (status.state === "granted") {
      throw new Error("HOME must not be readable in this test");
    }
  },
});

// Coverage is a two-command flow: collect raw data during tests, then render
// it separately so reporting stays outside test behavior.
export const coverageCommands = [
  "deno test --coverage=.coverage lessons/14_deno_runtime/03_deno_testing.test.ts",
  "deno coverage .coverage",
] as const;

// Keeping compatibility examples as data avoids teaching node:test as the
// native Deno testing style.
export const nodeTestCompatibilityExample =
  'Node compatibility example (not Deno-native): import test from "node:test";';
