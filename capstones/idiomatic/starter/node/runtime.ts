import { CapstoneIncompleteError } from "../../../shared/harness.ts";
import {
  CAPSTONE_IMPLEMENTATION,
  type RelayHttpHandler,
  type RuntimeCapabilities,
  type ServeOptions,
} from "../core/index.ts";
import { NodeFileEventLog } from "./file-log.ts";

function incomplete(boundary: string): CapstoneIncompleteError {
  return new CapstoneIncompleteError("idiomatic", CAPSTONE_IMPLEMENTATION, boundary);
}

function incompleteInput(boundary: string): AsyncIterable<Uint8Array> {
  return {
    [Symbol.asyncIterator](): AsyncIterator<Uint8Array> {
      return {
        next: () => Promise.reject(incomplete(boundary)),
      };
    },
  };
}

export async function serveNodeRelay(
  _options: ServeOptions,
  _handler: RelayHttpHandler,
  _signal: AbortSignal,
): Promise<void> {
  throw incomplete("TODO(m4-http): serve the Node relay");
}

export function createNodeCapabilities(signal: AbortSignal): RuntimeCapabilities {
  return {
    signal,
    io: {
      stdout: (_text) => undefined,
      stderr: (_text) => undefined,
    },
    openLog: (path, capacity) => new NodeFileEventLog(path, capacity),
    readInput: () => incompleteInput("TODO(m3-adapter): read Node relay input"),
    serve: serveNodeRelay,
  };
}
