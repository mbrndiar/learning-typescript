export interface Capabilities {
  readonly runtime: string;
  readonly permissions: boolean;
  readonly nodeSqlite: boolean;
}

export function describeCapabilities(_capabilities: Capabilities): string {
  throw new Error("TODO: describe the supplied capabilities");
}
