interface LogContext {
  readonly operation: string;
  readonly requestId?: string;
}

function log(level: "info" | "error", message: string, context: LogContext): void {
  const entry = {
    // Fixed time keeps lesson output deterministic; production logs use the current time.
    time: new Date(0).toISOString(),
    level,
    message,
    ...context,
  };
  console.error(JSON.stringify(entry));
}

log("info", "task stored", {
  operation: "task.add",
  requestId: "demo-request",
});
