import { serveDenoRelay } from "../../solution/deno/runtime.ts";
import { runM4HttpContract } from "../contracts/m4-http.ts";

Deno.test({
  name: "m4-http: Deno loopback relay service",
  permissions: { net: ["127.0.0.1"] },
  fn: () => runM4HttpContract(serveDenoRelay),
});
