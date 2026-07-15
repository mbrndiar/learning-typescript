# 🟩 Node.js Task Manager CLI

The Node.js entry point combines portable CLI execution from `task-core` with
Node's atomic, cross-process-coordinated JSON storage or the portable REST
adapter in [`project/task-client/rest-storage.ts`](../task-client/rest-storage.ts).

```bash
npm run lesson -- project/task-manager/main.ts add "Learn TypeScript"
npm run lesson -- project/task-manager/main.ts list

npm run lesson -- project/task-manager/main.ts \
  --backend rest --url http://127.0.0.1:8080 add "Remote task"
```

The pure `parseCli` and `runCliCore` boundaries keep process state and terminal
output testable. `FileTaskStorage` is intentionally Node-specific because it
uses `node:fs`, file modes, process IDs, and `proper-lockfile`.
