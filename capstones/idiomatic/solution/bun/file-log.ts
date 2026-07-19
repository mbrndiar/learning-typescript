import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { relayFailure, VersionedEventLog, type LogStorage } from "../core/index.ts";

function decodeLogText(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw relayFailure("log_corrupt", "event log is not valid UTF-8");
  }
}

export class BunLogStorage implements LogStorage {
  constructor(private readonly path: string) {}

  async readText(): Promise<string | undefined> {
    const file = Bun.file(this.path);
    return (await file.exists())
      ? decodeLogText(new Uint8Array(await file.arrayBuffer()))
      : undefined;
  }

  async createText(text: string): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    if (await Bun.file(this.path).exists()) {
      throw new Error("event log already exists");
    }
    await Bun.write(this.path, text);
  }

  appendText(text: string): Promise<void> {
    return appendFile(this.path, text, { encoding: "utf8", flag: "a" });
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
