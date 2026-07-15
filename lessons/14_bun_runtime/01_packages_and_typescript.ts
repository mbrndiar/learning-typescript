type CommandPurpose = {
  readonly command: string;
  readonly purpose: string;
};

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

const packageSecurityExample = {
  scripts: {
    check: "tsc --noEmit",
  },
  trustedDependencies: ["reviewed-native-addon"],
} as const;

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
