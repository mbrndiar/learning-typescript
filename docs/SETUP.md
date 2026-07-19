# 🛠️ Setting Up JavaScript, TypeScript, and the Runtimes

Node.js is the only requirement at the start. Install Deno and Bun when you
reach modules 14 and 15 so early lessons stay focused.

## 🟩 1. Install Node.js

Install Node.js 24 LTS or Node.js 26 Current from <https://nodejs.org/> and
verify:

```bash
node --version
npm --version
```

As of July 2026, Node.js 24 is LTS and Node.js 26 is Current. The course uses
Node.js 24 as its minimum supported version.

## 📁 2. Get the code

```bash
git clone https://github.com/mbrndiar/learning-typescript.git
cd learning-typescript
npm install
```

`npm install` uses `package-lock.json` to install the pinned TypeScript, ESLint,
Prettier, `tsx`, OpenAPI parser, Node types, and Bun types used by the course.
Use `npm ci` in automation or when reproducing CI from an unchanged lockfile.

The course pins TypeScript 6.0.3. TypeScript 7.0 is stable and current, but its
initial native release deliberately ships without the compiler API used by tools
such as `typescript-eslint`. The TypeScript team documents 6.0 as the bridge to
7.0 and recommends the 6.x compatibility package for those integrations. This
course therefore teaches stable language and configuration practices on 6.0
rather than making a newly released toolchain split the learner's checker and
linter. Re-evaluate this boundary when the TypeScript 7 compiler API and its
dependent tooling are stable together:

- <https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/>
- <https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/>
- <https://typescript-eslint.io/users/dependency-versions/>

## 🧑‍💻 3. Choose an editor

- Visual Studio Code with the built-in TypeScript language service
- WebStorm
- Neovim, Vim, Emacs, or another editor configured for TypeScript

Open the repository root so the editor finds `tsconfig.json`,
`tsconfig.node.json`, `tsconfig.bun.json`, and `deno.json`.

## ▶️ 4. Run the first lessons

```bash
node lessons/01_javascript_programs_and_values/01_programs_and_primitives.js
npm run lesson -- lessons/04_typescript_foundations/01_migrating_javascript.ts
```

Modules 1-13 require only Node.js:

```bash
npm run typecheck:node
npm run course:node
npm run test:node
npm run coverage
```

After modules 14-16, the compact Task REST API applied project uses all three
runtimes. Start at [`projects/tasks/README.md`](../projects/tasks/README.md);
complete it before choosing a capstone.

## 🦕 5. Install Deno for module 14

Use an official package or installer from <https://docs.deno.com/runtime/getting_started/installation/>.
The course validates Deno 2.9.3:

```bash
deno --version
deno task check
```

`deno.json` owns Deno tasks, formatting, linting, checking, tests, and lesson
execution. `deno.lock` pins resolved JSR and npm dependencies.
`npm run check:deno` is the package-script wrapper for `deno task check`.

Deno denies sensitive access by default. Prefer narrow grants:

```bash
deno run --allow-read=.relay-data --allow-write=.relay-data \
  capstones/idiomatic/solution/deno/main.ts replay \
  --log .relay-data/events.jsonl
```

Avoid `-A` while learning. It grants all permissions and hides the capability
boundary the module is designed to teach. Grant the containing state directory,
not just a not-yet-created file: the atomic writer must create the directory and
a temporary sibling before renaming it.

The Task project uses `jsr:@db/sqlite@0.13.0`. Its separate
`deno task tasks:test` runner grants only its child test process loopback
networking, project test-data, FFI, named SQLite loader variables, and its
selected cache's `plug` directory. It honors explicit `DENO_DIR`; otherwise it
uses the standard Linux (`XDG_CACHE_HOME` or `HOME/.cache`), macOS
(`HOME/Library/Caches`), or Windows (`LOCALAPPDATA`) location. The ordinary
`deno task test` lesson and capstone suites retain their original narrow
permissions: no FFI, public GitHub access, or cache writes.

## 🥟 6. Install Bun for module 15

Use an official package or installer from <https://bun.sh/docs/installation>.
The course validates Bun 1.3.14:

```bash
bun --version
bun install --frozen-lockfile --ignore-scripts
npm run check:bun
```

Bun executes TypeScript by transpiling it; it does not replace strict static
checking. `npm run check:bun` runs `npm run typecheck:bun`, Bun tests, the Bun
course collector, the bundle/compile smoke test, and `bun audit`.

Review lifecycle scripts before trusting a dependency. Bun blocks arbitrary
dependency lifecycle scripts unless they are explicitly trusted.

## 🧰 7. Understand the tool boundaries

| Tool                                                                        | Main responsibility                                       |
| --------------------------------------------------------------------------- | --------------------------------------------------------- |
| `node`                                                                      | Node.js execution and native erasable type stripping      |
| `npm`                                                                       | Node package installation and `package.json` scripts      |
| [`tsx`](https://tsx.is/)                                                    | Predictable Node execution of full TypeScript syntax      |
| [`tsc`](https://www.typescriptlang.org/docs/handbook/compiler-options.html) | Strict static checking for Node and Bun source trees      |
| [ESLint](https://eslint.org/docs/latest/)                                   | Suspicious JavaScript and TypeScript patterns             |
| [Prettier](https://prettier.io/docs/)                                       | Repository formatting outside Deno-native TypeScript      |
| [`node:test`](https://nodejs.org/api/test.html)                             | Node.js tests and coverage                                |
| [`deno`](https://docs.deno.com/runtime/reference/cli/)                      | Deno execution, permissions, format, lint, check, test    |
| [`bun`](https://bun.sh/docs/cli/run)                                        | Bun execution, package install, tests, build, and compile |

Execution and type checking are separate in Node.js and Bun. Deno type-checks
through `deno check`; still keep runtime validation for JSON, environment,
commands, files, and HTTP.

## 🧩 8. Configuration and coverage boundaries

- `tsconfig.base.json` owns the strict options shared by the TypeScript compiler
  configurations.
- `tsconfig.node.json` checks Node-compatible lessons, exercises, both Node
  capstones, the Tasks shared/Node trees, and Node tooling while excluding
  native Deno and Bun globals.
- `tsconfig.capstones.node.json` is the focused Node capstone check.
- `tsconfig.tasks.node.json` and `tsconfig.tasks.bun.json` are focused Tasks
  checks; `tsconfig.bun.json` additionally includes the Tasks shared/Bun tree
  with Bun globals only.
- Root `tsconfig.json` extends the Node configuration for editor discovery.
- `deno.json` independently owns Deno compiler options, source scopes,
  permissions, tasks, formatting, linting, and the frozen root `deno.lock`.

`npm run coverage` runs three Node coverage commands. Both capstones and the
Tasks shared/Node adapter gate enforce at least 85% lines, 85% functions, and
80% branches.
`coverage:idiomatic` scopes measurement to the portable solution core;
`coverage:comparative` also exercises its subprocess fixture support; and
`coverage:tasks` excludes only Tasks composition/index declarations. Deno and
Bun expose native coverage commands for runtime-focused investigation, but the
repository-wide numeric gate is the Node coverage command.

## ⌨️ 9. Essential commands

```bash
# Node.js path
npm run format:check
npm run lint
npm run typecheck:node
npm run typecheck:capstones:node
npm run course:node
npm run test:node
CAPSTONE_IMPLEMENTATION=solution npm run test:capstones:node
npm run coverage
npm run links
npm run audit:node
npm run openapi:tasks
npm run check:tasks:node
npm run check:node

# Deno path
deno task fmt:check
deno task lint
deno task typecheck
deno task test
deno task course
deno task docs
deno task audit
deno task compile
deno task check
deno task tasks:typecheck
deno task tasks:test
deno task tasks:docs
deno task tasks:audit
deno task tasks:check
# Equivalent package wrapper: npm run check:deno

# Bun path
npm run typecheck:bun
npm run build:bun
npm run audit:bun
npm run check:bun
npm run check:tasks:bun

# Portable evidence
npm run portability
deno run scripts/runtime-conformance.ts
bun run scripts/runtime-conformance.ts
npm run portability:tasks
npm run test:tasks:interoperability
```

The Deno and Bun `check` commands already include their native audit. Audits may
contact package advisory services and therefore require network access.

`CAPSTONE_IMPLEMENTATION` and `TASKS_IMPLEMENTATION` accept `starter` or
`solution` and default to `solution`, so aggregate validation checks completed
references. Select `starter` explicitly for guided milestone feedback. CI sets
both to `solution`.

## ⚠️ Troubleshooting

### ⚠️ Node is too old

Install Node.js 24 LTS or Node.js 26 Current and restart the terminal and editor.

### ⚠️ Deno or Bun is not found

Restart the terminal after installation and ensure the installer's binary
directory is on `PATH`. Re-run `deno --version` or `bun --version`.

### ⚠️ A Deno permission is denied

Read the denied resource in the error. Add the narrowest matching
`--allow-read`, `--allow-write`, `--allow-env`, `--allow-net`, or
`--allow-run` grant instead of switching to `-A`.

### ⚠️ `npm install` or `bun install` fails

Check the first error, network/proxy settings, disk space, and runtime version.
Do not delete committed lockfiles to make an error disappear.

### ⚠️ The editor reports different types

Use the workspace TypeScript version for Node/Bun files and the Deno language
server for `lessons/14_deno_runtime`, `exercises/14_deno_runtime`, and
the idiomatic Deno adapter. The authoritative commands are
`npm run typecheck:node`, `npm run typecheck:capstones:node`,
`npm run typecheck:bun`, and `deno task typecheck`.

### ⚠️ Deno prints `@types/node` resolution warnings

After `npm install`, Deno 2.9.3 may print `Failed resolving types` warnings while
`deno doc` inspects the root `node_modules/@types/node` package. The Deno source
does not import those declarations; this specific warning is non-fatal when
`deno task check` still exits successfully. Investigate any actual error or
non-zero exit instead of ignoring it.

### ⚠️ An import cannot be resolved

Use explicit relative file extensions:

```typescript
import { parseEvent } from "./event.ts";
```

Node uses `NodeNext`, Bun uses `Bundler` resolution for its native source tree,
and Deno resolves imports through `deno.json` and explicit specifiers.
