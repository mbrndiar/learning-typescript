# Exercise 3: Build a Catalog

Turn an array of item objects into useful collection views.

## Contract

`buildCatalog(items)` returns an object with:

- `byId`: a `Map` from each item ID to a copied item object;
- `tags`: an array of unique tags in first-seen order; and
- `totalStock`: the sum of every item's `stock`.

Use destructuring while iterating, spread to copy each item, and a `Set` to track
unique tags.

`getCatalogItem(catalog, id)` returns the mapped item. If the ID is missing, it
throws an `Error` with the message `Unknown item: <id>`.

## Run the reference tests

```bash
node --test exercises/03_collections_objects_and_modules/solution.test.js
```

The tests use an explicit `.js` import. Point that import at `exercise.js` while
working, then restore it to `solution.js`.
