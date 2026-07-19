import { CapstoneIncompleteError } from "../../../shared/harness.ts";
import { CAPSTONE_IMPLEMENTATION, type LogStorage, VersionedEventLog } from "../core/index.ts";

function incomplete(boundary: string): CapstoneIncompleteError {
  return new CapstoneIncompleteError("idiomatic", CAPSTONE_IMPLEMENTATION, boundary);
}

export class DenoLogStorage implements LogStorage {
  constructor(_path: string) {}

  readText(): Promise<string | undefined> {
    return Promise.reject(incomplete("TODO(m3-adapter): read Deno event logs"));
  }

  createText(_text: string): Promise<void> {
    return Promise.reject(incomplete("TODO(m3-adapter): create Deno event logs"));
  }

  appendText(_text: string): Promise<void> {
    return Promise.reject(incomplete("TODO(m3-adapter): append Deno event logs"));
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}

export class DenoFileEventLog extends VersionedEventLog {
  constructor(path: string, capacity = 10_000) {
    super(new DenoLogStorage(path), capacity);
  }
}
