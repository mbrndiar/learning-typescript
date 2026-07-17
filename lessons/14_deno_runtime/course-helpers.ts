// Tiny shared helpers keep lesson examples focused on runtime boundaries
// instead of repeating formatting utilities in each file.
export function stableLines(lines: readonly string[]): string {
  return [...lines].sort().join("\n");
}
