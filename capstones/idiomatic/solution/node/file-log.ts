import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { VersionedEventLog, type LogStorage } from "../core/index.ts";

function hasCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

export class NodeLogStorage implements LogStorage {
  constructor(private readonly path: string) {}

  async readText(): Promise<string | undefined> {
    try {
      return await readFile(this.path, "utf8");
    } catch (error: unknown) {
      if (hasCode(error, "ENOENT")) {
        return undefined;
      }
      throw error;
    }
  }

  async createText(text: string): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, text, { encoding: "utf8", flag: "wx", mode: 0o600 });
  }

  appendText(text: string): Promise<void> {
    return appendFile(this.path, text, { encoding: "utf8", flag: "a" });
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}

export class NodeFileEventLog extends VersionedEventLog {
  constructor(path: string, capacity = 10_000) {
    super(new NodeLogStorage(path), capacity);
  }
}
