# 🛠️ Setting Up JavaScript and TypeScript

## 1. Install Node.js

Install Node.js 24 LTS or newer from <https://nodejs.org/> and verify both
commands:

```bash
node --version
npm --version
```

As of July 2026, Node.js 24 is LTS and Node.js 26 is Current. The course uses
Node.js 24 as its minimum supported version.

## 2. Get the code

```bash
git clone https://github.com/mbrndiar/learning-typescript.git
cd learning-typescript
npm install
```

`npm install` uses the committed lock file to install the exact development
tool versions used by the course.

## 3. Choose an editor

- Visual Studio Code with the built-in TypeScript language service
- WebStorm
- Neovim, Vim, Emacs, or another editor configured with TypeScript support

Open the repository root, not one lesson directory, so the editor finds
`tsconfig.json`.

## 4. Run the first lessons

```bash
node lessons/01_javascript_programs_and_values/01_programs_and_primitives.js
npm run lesson -- lessons/04_typescript_foundations/01_migrating_javascript.ts
```

## 5. Understand the tools

- `node` executes JavaScript and can strip erasable TypeScript syntax.
- `npm` installs packages and runs scripts from `package.json`.
- `tsx` executes TypeScript with full syntax support for course examples.
- `tsc --noEmit` checks types without producing JavaScript files.
- ESLint detects suspicious JavaScript and TypeScript patterns.
- Prettier applies one consistent format.
- `node:test` is Node's built-in test runner.

Execution and type checking are separate. A TypeScript file can execute and
still contain a type error unless `tsc` is also run.

## 6. Essential commands

```bash
npm run lesson -- path/to/example.ts
npm run typecheck
npm run lint
npm run format
npm run course
npm test
npm run coverage
npm run check
```

## Troubleshooting

### Node is too old

Install Node.js 24 or newer with an official installer or a version manager.
Restart the terminal and editor after changing versions.

### `npm install` fails

Check the first error, network/proxy settings, available disk space, and the
Node version. Do not delete `package-lock.json`; it is part of the course's
reproducible setup.

### The editor reports different types

Use the workspace TypeScript version when the editor offers that choice. Run
`npm run typecheck` as the authoritative repository check.

### An import cannot be resolved

Use explicit relative file extensions:

```typescript
import { parseTask } from "./task.ts";
```

The course uses ES modules and Node's `NodeNext` resolution rules.
