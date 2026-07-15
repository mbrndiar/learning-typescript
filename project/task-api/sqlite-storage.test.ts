// Holds the SQLite backend to the same shared contract as every other backend,
// so its persistence details never let its behavior drift from the domain.
import { registerStorageContract } from "../test-support/storage-contract.ts";
import { SqliteTaskStorage } from "./sqlite-storage.ts";

registerStorageContract("SqliteTaskStorage", async () => {
  const storage = new SqliteTaskStorage();
  return {
    storage,
    close: () => storage.close(),
  };
});
