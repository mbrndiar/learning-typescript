export function buildCatalog(items) {
  // TODO: Accumulate stock, copied items, and unique tags.
  return {
    byId: new Map(items.map((item) => [item.id, { ...item }])),
    tags: [],
    totalStock: 0,
  };
}

export function getCatalogItem(catalog, id) {
  // TODO: Throw an Error when the ID is absent.
  return catalog.byId.get(id);
}
