import { DatabaseSync } from "node:sqlite";

const database = new DatabaseSync(":memory:");

try {
  database.exec(`
    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL CHECK (length(trim(title)) > 0),
      done INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1))
    )
  `);

  const insert = database.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)");

  database.exec("BEGIN");
  try {
    insert.run("Learn parameter binding", 0);
    insert.run("Commit related writes together", 0);
    database.exec("COMMIT");
  } catch (error: unknown) {
    database.exec("ROLLBACK");
    throw error;
  }

  const tasks = database.prepare("SELECT id, title, done FROM tasks ORDER BY id").all();
  console.log(tasks);
} finally {
  database.close();
}
