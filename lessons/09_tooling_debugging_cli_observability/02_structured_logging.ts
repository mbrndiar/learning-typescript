// Structured logs describe events as data. Writing JSON diagnostics to stderr
// keeps them machine-readable without mixing them with program output.
interface LogContext {
  // Keep context allowlisted and small; never spread environment objects or
  // user-provided records that may contain secrets.
  readonly operation: string;
  readonly requestId?: string;
}

// CONTRACT: emit one complete diagnostic event with a level and reviewed
// context fields that downstream log processors can filter.
function log(level: "info" | "error", message: string, context: LogContext): void {
  const entry = {
    // Fixed time keeps lesson output deterministic; production logs use now.
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
