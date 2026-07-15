# 🧠 Shared Task Core

This directory contains the runtime-neutral Task domain used by Node.js, Deno,
and Bun.

## 🧩 What belongs here

- Task validation and parsing
- The `TaskStorage` contract
- Domain coordination in `TaskManager`
- The portable JSON document format
- CLI parsing and execution with injected storage and output

Code in this directory uses ECMAScript and Web-standard APIs only. Runtime
adapters provide files, processes, servers, databases, and concrete CLI entry
points.
