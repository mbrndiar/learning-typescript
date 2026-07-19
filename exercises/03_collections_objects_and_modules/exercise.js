// Contract: turn a list of items into a catalog with three views -- a Map
// keyed by id (copying each item and its nested tags array),
// the list of unique tags across all items, and the summed stock.
export function buildCatalog(items) {
  // TODO: Accumulate stock, copied items, and unique tags.
  return {
    byId: new Map(items.map((item) => [item.id, { ...item, tags: [...item.tags] }])),
    tags: [],
    totalStock: 0,
  };
}

// Contract: return the item for `id`, or throw when it is absent. A Map
// returns undefined for a missing key, so treat that as the error case rather
// than passing undefined back to the caller.
export function getCatalogItem(catalog, id) {
  // TODO: Throw an Error when the ID is absent.
  return catalog.byId.get(id);
}
