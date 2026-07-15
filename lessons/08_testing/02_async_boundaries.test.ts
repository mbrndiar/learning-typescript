import assert from "node:assert/strict";
import test from "node:test";

// Injecting the request function turns network I/O into a boundary the test
// controls. The test stays deterministic because it performs no real request.
type RequestText = (url: URL) => Promise<string>;

async function loadGreeting(url: URL, requestText: RequestText): Promise<string> {
  const text = await requestText(url);
  if (text.trim() === "") {
    throw new Error("empty greeting");
  }
  return text.trim();
}

test("loadGreeting uses the injected request boundary", async () => {
  const seen: URL[] = [];
  // Capturing the URL verifies the boundary contract without coupling the
  // test to any private implementation details.
  const greeting = await loadGreeting(
    new URL("https://example.invalid/greeting"),
    async (url) => {
      seen.push(url);
      return "  hello  ";
    },
  );

  assert.equal(greeting, "hello");
  assert.equal(seen[0]?.pathname, "/greeting");
});

test("loadGreeting rejects an empty response", async () => {
  // Promise failures must be checked with assert.rejects; assert.throws only
  // observes synchronous exceptions before a promise is returned.
  await assert.rejects(
    loadGreeting(new URL("https://example.invalid"), async () => " "),
    /empty greeting/,
  );
});
