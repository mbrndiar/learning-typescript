export function buildCatalog(items) {
  const byId = new Map();
  const uniqueTags = new Set();
  let totalStock = 0;

  for (const item of items) {
    const { id, stock, tags } = item;
    byId.set(id, { ...item });
    totalStock += stock;

    for (const tag of tags) {
      uniqueTags.add(tag);
    }
  }

  return {
    byId,
    tags: [...uniqueTags],
    totalStock,
  };
}

export function getCatalogItem(catalog, id) {
  const item = catalog.byId.get(id);

  if (item === undefined) {
    throw new Error(`Unknown item: ${id}`);
  }

  return item;
}
