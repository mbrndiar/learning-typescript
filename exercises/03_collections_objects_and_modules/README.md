# 🧠 Exercise 3: Build a Catalog

Turn an array of item objects into useful collection views.

## 📋 Contract

`buildCatalog(items)` returns an object with:

- `byId`: a `Map` from each item ID to an item whose object and nested `tags`
  array are copied;
- `tags`: an array of unique tags in first-seen order; and
- `totalStock`: the sum of every item's `stock`.

Use destructuring while iterating, spread to copy the item and its nested array,
and a `Set` to track unique tags. Object spread alone is shallow.

`getCatalogItem(catalog, id)` returns the mapped item. If the ID is missing, it
throws an `Error` with the message `Unknown item: <id>`.

## ▶️ Run the feedback

```bash
EXERCISE_IMPLEMENTATION=exercise \
  node --test exercises/03_collections_objects_and_modules/solution.test.js
node --test exercises/03_collections_objects_and_modules/solution.test.js
```

The first command selects your starter; the second selects the reference solution.
