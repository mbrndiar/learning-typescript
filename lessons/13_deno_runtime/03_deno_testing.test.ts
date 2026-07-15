interface Hooks {
  readonly beforeEach?: () => void | Promise<void>;
  readonly afterEach?: () => void | Promise<void>;
}

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

export const coverageCommands = [
  "deno test --coverage=.coverage lessons/13_deno_runtime/03_deno_testing.test.ts",
  "deno coverage .coverage",
] as const;

export const nodeTestCompatibilityExample =
  'Node compatibility example (not Deno-native): import test from "node:test";';
