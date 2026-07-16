import { type LogStorage, VersionedEventLog } from "../core/index.ts";

function parentDirectory(path: string): string {
  const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return index < 0 ? "." : path.slice(0, index) || "/";
}

export class DenoLogStorage implements LogStorage {
  constructor(private readonly path: string) {}

  async readText(): Promise<string | undefined> {
    try {
      return await Deno.readTextFile(this.path);
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
