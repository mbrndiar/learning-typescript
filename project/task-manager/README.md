# ⌨️ Task Manager CLI

The CLI parses terminal arguments, creates a `TaskManager`, and selects either
atomic JSON storage or the REST adapter.

```bash
npm run lesson -- project/task-manager/main.ts add "Learn TypeScript"
npm run lesson -- project/task-manager/main.ts list

npm run lesson -- project/task-manager/main.ts \
  --backend rest --url http://127.0.0.1:8080 add "Remote task"
```

The pure `parseCli` and injected `runCli` boundaries keep process state and
terminal output testable.
