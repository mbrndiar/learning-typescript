import "node:sqlite";

declare module "node:sqlite" {
  interface DatabaseSyncOptions {
    readonly defensive?: boolean;
  }

  interface DatabaseSync {
    enableDefensive(enabled: boolean): void;
  }
}
