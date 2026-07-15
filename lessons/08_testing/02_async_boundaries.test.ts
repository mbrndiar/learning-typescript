import assert from "node:assert/strict";
import test from "node:test";

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
  await assert.rejects(
    loadGreeting(new URL("https://example.invalid"), async () => " "),
    /empty greeting/,
  );
});
