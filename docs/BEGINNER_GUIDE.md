# 🌱 Beginner's Guide

## 🧬 Language, type checker, and runtime

Three related tools appear throughout this course:

1. **JavaScript** is the language that actually runs.
2. **TypeScript** adds a static type system and is converted to JavaScript before
   or while it runs.
3. **Node.js** is the primary runtime: it supplies files, processes, networking,
   tests, and other APIs beyond the language itself.

Deno and Bun are alternative runtimes. They execute the same core language but
do not implement every Node API identically.

## 👀 How to read code

Work from the outside inward:

- identify literal values such as `"hello"`, `42`, and `true`;
- find names introduced with `const`, `let`, parameters, or imports;
- find function calls by looking for parentheses after a name;
- follow braces to see where blocks, functions, and objects begin and end;
- read a type after `:` as a constraint checked before execution.

## ▶️ First 30 minutes

1. Run the first JavaScript lesson.
2. Change the displayed name and run it again.
3. Introduce a spelling error and read the complete runtime message.
4. Restore the file and predict the second lesson's output.
5. Do not memorize every symbol. Explain one line at a time in plain language.

## ⚠️ Productive mistakes

Syntax errors, failed tests, and type errors are feedback. Read the first
actionable message, locate the named file and line, state what rule was broken,
then make the smallest correction. Avoid changing several unrelated lines at
once.

## 🧩 Applied project before capstones

After module 16, complete the
[Task REST API project](../projects/tasks/README.md). It combines strict
validation, native HTTP/SQLite/Markdown adapters, and one Fetch client across
Node.js, Deno, and Bun before the final capstones.

```bash
TASKS_IMPLEMENTATION=solution npm run check:tasks:node
TASKS_IMPLEMENTATION=solution deno task tasks:check
TASKS_IMPLEMENTATION=solution npm run check:tasks:bun
npm run portability:tasks
npm run test:tasks:interoperability
```

The last command is finite: it proves six server/backend cells and nine
cross-runtime SQLite client/server cells. The Deno command uses only the
permissions named in `deno.json`, never a blanket permission flag.
