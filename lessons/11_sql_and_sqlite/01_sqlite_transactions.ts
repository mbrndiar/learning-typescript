import { DatabaseSync } from "node:sqlite";

// This lesson uses an in-memory SQLite database so the transaction and
// parameter-binding behavior is real, but no file is left behind afterward.
const database = new DatabaseSync(":memory:");

try {
  // Database constraints are a second line of defense: even if application
  // validation misses a blank title or invalid done flag, SQLite rejects it.
  database.exec(`
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL CHECK (length(trim(title)) > 0),
      done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1))
    )
  `);

  // A prepared statement keeps SQL syntax separate from values. The question
  // marks are placeholders, so task titles are sent as data, not executable
  // SQL text.
  const insert = database.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)");

  // These inserts are one logical change. The transaction makes them atomic:
  // readers should see both committed rows, or no rows if any step fails.
  database.exec("BEGIN");
  try {
    insert.run("Learn parameter binding", 0);
    insert.run("Commit related writes together", 0);
    database.exec("COMMIT");
  } catch (error: unknown) {
    // Rollback restores the pre-transaction invariant, preventing a partial
    // write from surviving after an error between related statements.
    database.exec("ROLLBACK");
    throw error;
  }

  const tasks = database.prepare("SELECT id, title, done FROM tasks ORDER BY id").all();
  console.log(tasks);
} finally {
  // Closing the handle releases native resources promptly; tests and servers
  // should not rely on process exit to clean up database connections.
  database.close();
}
