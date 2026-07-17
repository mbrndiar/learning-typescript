import "node:sqlite";

declare module "node:sqlite" {
  interface DatabaseSync {
    enableDefensive?(enabled: boolean): void;
  }
}
