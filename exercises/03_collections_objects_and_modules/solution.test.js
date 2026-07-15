import assert from "node:assert/strict";
import test from "node:test";

import { buildCatalog, getCatalogItem } from "./solution.js";

const items = [
  { id: "p1", name: "Pen", stock: 3, tags: ["writing", "school"] },
  { id: "p2", name: "Book", stock: 2, tags: ["school", "reading"] },
];

test("builds keyed, unique, and accumulated catalog data", () => {
  const catalog = buildCatalog(items);

  assert.deepEqual(catalog.tags, ["writing", "school", "reading"]);
  assert.equal(catalog.totalStock, 5);
  assert.deepEqual(catalog.byId.get("p2"), items[1]);
  assert.notEqual(catalog.byId.get("p1"), items[0]);
});

test("gets a known item and rejects an unknown ID", () => {
  const catalog = buildCatalog(items);

  assert.equal(getCatalogItem(catalog, "p1").name, "Pen");
  assert.throws(() => getCatalogItem(catalog, "missing"), {
    message: "Unknown item: missing",
  });
});
