export interface Capabilities {
  readonly runtime: string;
  readonly permissions: boolean;
  readonly nodeSqlite: boolean;
}

export function describeCapabilities(capabilities: Capabilities): string {
  const security = capabilities.permissions
    ? "explicit permissions"
    : "process authority";
  const sqlite = capabilities.nodeSqlite
    ? "node:sqlite available"
    : "node:sqlite unavailable";
  return `${capabilities.runtime}: ${security}; ${sqlite}`;
}
