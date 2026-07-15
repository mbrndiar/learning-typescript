import { describeCapabilities } from "../exercises/12_runtime_portability/solution.ts";

const description = describeCapabilities({
  runtime: "portable-smoke",
  permissions: false,
  nodeSqlite: false,
});

if (description !== "portable-smoke: process authority; node:sqlite unavailable") {
  throw new Error(`unexpected capability description: ${description}`);
}

const bytes = new TextEncoder().encode("runtime portability");
const digest = await crypto.subtle.digest("SHA-256", bytes);
if (digest.byteLength !== 32) {
  throw new Error(`unexpected SHA-256 length: ${digest.byteLength}`);
}

console.log("portable TypeScript smoke test passed");
