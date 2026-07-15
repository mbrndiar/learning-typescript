export function stableLines(lines: readonly string[]): string {
  return [...lines].sort().join("\n");
}
