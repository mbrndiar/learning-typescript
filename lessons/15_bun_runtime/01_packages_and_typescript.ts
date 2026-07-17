// This lesson separates Bun's convenience from its safety boundary: running
// TypeScript is transpilation, package installs are supply-chain changes, and
// lifecycle scripts are trust decisions.
type CommandPurpose = {
  readonly command: string;
  readonly purpose: string;
};

// Similar-looking Bun commands have different durability effects: some only
// execute code, while others rewrite dependency metadata or the lockfile.
const commands = [
  { command: "bun install", purpose: "resolve dependencies and update bun.lock" },
  {
    command: "bun install --frozen-lockfile",
    purpose: "install exactly the committed lockfile in automation",
  },
  { command: "bun add zod", purpose: "add a runtime dependency" },
  { command: "bun add --dev typescript", purpose: "add a development dependency" },
  { command: "bun run check", purpose: "run a package.json script" },
  { command: "bun run app.ts", purpose: "transpile and execute TypeScript" },
  { command: "bunx tsc --noEmit", purpose: "execute tsc and statically type-check" },
] satisfies readonly CommandPurpose[];

// trustedDependencies is an explicit allow-list for dependency lifecycle
// scripts. Treat it like granting code execution during install, not like a
// setting to toggle until installation becomes quiet.
const packageSecurityExample = {
  scripts: {
    check: "tsc --noEmit",
  },
  trustedDependencies: ["reviewed-native-addon"],
} as const;

// bunfig.toml controls Bun runtime/tool behavior. package.json still remains
// the portable package contract that other JavaScript tooling understands.
const bunfigExample = `
# bunfig.toml configures Bun itself; package.json still owns package metadata.
[install]
exact = true

[test]
coverage = true
`.trim();

interface RuntimeMessage {
  readonly runtime: "Bun";
  readonly version: string;
}

// Bun strips this interface while transpiling. It does not prove every file in
// the project is type-correct; that remains tsc's job.
const runtimeMessage: RuntimeMessage = {
  runtime: "Bun",
  version: Bun.version,
};

console.log(runtimeMessage);
console.table(commands);
console.log({
  lockfile: "bun.lock is committed and reviewed",
  trustedDependencies: packageSecurityExample.trustedDependencies,
  lifecycleRule: "trust only audited packages that require install scripts",
  bunfigExample,
});
