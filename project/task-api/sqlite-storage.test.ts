import { registerStorageContract } from "../test-support/storage-contract.ts";
import { SqliteTaskStorage } from "./sqlite-storage.ts";

registerStorageContract("SqliteTaskStorage", async () => {
  const storage = new SqliteTaskStorage();
  return {
    storage,
    close: () => storage.close(),
  };
});
