import assert from "node:assert/strict";
import test from "node:test";

const target = globalThis.process.env.EXERCISE_IMPLEMENTATION ?? "solution";
if (target !== "exercise" && target !== "solution") {
  throw new TypeError("EXERCISE_IMPLEMENTATION must be exercise or solution");
}
const { buildCatalog, getCatalogItem } =
  target === "exercise" ? await import("./exercise.js") : await import("./solution.js");

const items = [
  { id: "p1", name: "Pen", stock: 3, tags: ["writing", "school"] },
  { id: "p2", name: "Book", stock: 2, tags: ["school", "reading"] },
];

test("builds keyed, unique, and accumulated catalog data", () => {
  const catalog = buildCatalog(items);

  assert.deepEqual(catalog.tags, ["writing", "school", "reading"]);
  assert.equal(catalog.totalStock, 5);
  assert.deepEqual(catalog.byId.get("p2"), items[1]);
  // deepEqual above confirms equal content; notEqual here confirms it is a
  // distinct object, proving buildCatalog copied the item instead of storing a
  // reference back to the caller's array.
  assert.notEqual(catalog.byId.get("p1"), items[0]);
  assert.notEqual(catalog.byId.get("p1").tags, items[0].tags);
  catalog.byId.get("p1").tags.push("catalog-only");
  assert.deepEqual(items[0].tags, ["writing", "school"]);
});

test("gets a known item and rejects an unknown ID", () => {
  const catalog = buildCatalog(items);

  assert.equal(getCatalogItem(catalog, "p1").name, "Pen");
  assert.throws(() => getCatalogItem(catalog, "missing"), {
    message: "Unknown item: missing",
  });
});
