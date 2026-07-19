import { type LogStorage, relayFailure, VersionedEventLog } from "../core/index.ts";

function parentDirectory(path: string): string {
  const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return index < 0 ? "." : path.slice(0, index) || "/";
}

function decodeLogText(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw relayFailure("log_corrupt", "event log is not valid UTF-8");
  }
}

export class DenoLogStorage implements LogStorage {
  constructor(private readonly path: string) {}

  async readText(): Promise<string | undefined> {
    try {
      return decodeLogText(await Deno.readFile(this.path));
    } catch (error: unknown) {
      if (error instanceof Deno.errors.NotFound) {
        return undefined;
      }
      throw error;
    }
  }

  async createText(text: string): Promise<void> {
    await Deno.mkdir(parentDirectory(this.path), { recursive: true });
    await Deno.writeTextFile(this.path, text, {
      createNew: true,
      mode: 0o600,
    });
  }

  appendText(text: string): Promise<void> {
    return Deno.writeTextFile(this.path, text, {
      append: true,
      create: false,
    });
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
