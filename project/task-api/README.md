# Task HTTP API

The API uses Node's HTTP server and built-in SQLite module without a framework.

```bash
npm run lesson -- project/task-api/main.ts
```

Set `PORT` or `TASK_DATABASE` to change the listening port or database path.
The server validates JSON boundaries, maps domain errors to HTTP status codes,
and closes the server and database on `SIGINT` or `SIGTERM`.
