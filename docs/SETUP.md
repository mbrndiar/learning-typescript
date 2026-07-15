# 🛠️ Setting Up JavaScript, TypeScript, and the Runtimes

Node.js is the only requirement at the start. Install Deno and Bun when you
reach modules 13 and 14 so early lessons stay focused.

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
Prettier, `tsx`, Node types, and Bun types used by the course.

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

Modules 1-12 require only Node.js:

```bash
npm run typecheck:node
npm run course:node
npm run test:node
npm run coverage
```

## 🦕 5. Install Deno for module 13

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
deno run --allow-read=tasks.json --allow-write=tasks.json \
  project/task-deno/main.ts list
```

Avoid `-A` while learning. It grants all permissions and hides the capability
boundary the module is designed to teach.

## 🥟 6. Install Bun for module 14

Use an official package or installer from <https://bun.sh/docs/installation>.
The course validates Bun 1.3.14:

```bash
bun --version
bun install --frozen-lockfile --ignore-scripts
npm run check:bun
```

Bun executes TypeScript by transpiling it; it does not replace strict static
checking. `npm run check:bun` runs `npm run typecheck:bun`, Bun tests, the Bun
course collector, and the bundle/compile smoke test.

Review lifecycle scripts before trusting a dependency. Bun blocks arbitrary
dependency lifecycle scripts unless they are explicitly trusted.

## 🧰 7. Understand the tool boundaries

| Tool        | Main responsibility                                       |
| ----------- | --------------------------------------------------------- |
| `node`      | Node.js execution and native erasable type stripping      |
| `npm`       | Node package installation and `package.json` scripts      |
| `tsx`       | Predictable Node execution of full TypeScript syntax      |
| `tsc`       | Strict static checking for Node and Bun source trees      |
| ESLint      | Suspicious JavaScript and TypeScript patterns             |
| Prettier    | Repository formatting outside Deno-native TypeScript      |
| `node:test` | Node.js tests and coverage                                |
| `deno`      | Deno execution, permissions, format, lint, check, test    |
| `bun`       | Bun execution, package install, tests, build, and compile |

Execution and type checking are separate in Node.js and Bun. Deno type-checks
through `deno check`; still keep runtime validation for JSON, environment,
commands, files, and HTTP.

## ⌨️ 8. Essential commands

```bash
# Node.js path
npm run format:check
npm run lint
npm run typecheck:node
npm run course:node
npm run test:node
npm run coverage
npm run links

# Deno path
deno task fmt:check
deno task lint
deno task typecheck
deno task test
deno task course
deno task docs
deno task compile
deno task check
# Equivalent package wrapper: npm run check:deno

# Bun path
npm run typecheck:bun
npm run build:bun
npm run check:bun

# Portable evidence
npm run portability
deno run scripts/runtime-conformance.ts
bun run scripts/runtime-conformance.ts
```

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
server for `lessons/13_deno_runtime`, `exercises/13_deno_runtime`, and
`project/task-deno`. The authoritative commands are `npm run typecheck:node`,
`npm run typecheck:bun`, and `deno task typecheck`.

### ⚠️ An import cannot be resolved

Use explicit relative file extensions:

```typescript
import { parseTask } from "./task.ts";
```

Node uses `NodeNext`, Bun uses `Bundler` resolution for its native source tree,
and Deno resolves imports through `deno.json` and explicit specifiers.
