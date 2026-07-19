import { CapstoneIncompleteError } from "../../../shared/harness.ts";
import {
  CAPSTONE_IMPLEMENTATION,
  VersionedEventLog,
  type LogStorage,
} from "../core/index.ts";

function incomplete(boundary: string): CapstoneIncompleteError {
  return new CapstoneIncompleteError("idiomatic", CAPSTONE_IMPLEMENTATION, boundary);
}

export class BunLogStorage implements LogStorage {
  constructor(_path: string) {}

  readText(): Promise<string | undefined> {
    return Promise.reject(incomplete("TODO(m3-adapter): read Bun event logs"));
  }

  createText(_text: string): Promise<void> {
    return Promise.reject(incomplete("TODO(m3-adapter): create Bun event logs"));
  }

  appendText(_text: string): Promise<void> {
    return Promise.reject(incomplete("TODO(m3-adapter): append Bun event logs"));
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}

export class BunFileEventLog extends VersionedEventLog {
  constructor(path: string, capacity = 10_000) {
    super(new BunLogStorage(path), capacity);
  }
}
