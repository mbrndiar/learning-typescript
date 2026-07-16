import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { VersionedEventLog, type LogStorage } from "../core/index.ts";

export class BunLogStorage implements LogStorage {
  constructor(private readonly path: string) {}

  async readText(): Promise<string | undefined> {
    const file = Bun.file(this.path);
    return (await file.exists()) ? file.text() : undefined;
  }

  async createText(text: string): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    if (await Bun.file(this.path).exists()) {
      throw new Error("event log already exists");
    }
    await Bun.write(this.path, text);
  }

  async appendText(text: string): Promise<void> {
    const file = Bun.file(this.path);
    await Bun.write(this.path, `${await file.text()}${text}`);
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
