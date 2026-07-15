const message = new TextEncoder().encode("portable TypeScript");
const digest = await crypto.subtle.digest("SHA-256", message);
const hexadecimal = Array.from(new Uint8Array(digest), (byte) =>
  byte.toString(16).padStart(2, "0"),
).join("");

const url = new URL("/tasks?done=false", "https://example.invalid");

console.log({
  hashPrefix: hexadecimal.slice(0, 12),
  path: url.pathname,
  done: url.searchParams.get("done"),
});
