// Node process entrypoint: forward argv (minus node + script) and surface the
// core's exit code via process.exitCode so the process ends cleanly.
import { runCli } from "./cli.ts";

process.exitCode = await runCli(process.argv.slice(2));
