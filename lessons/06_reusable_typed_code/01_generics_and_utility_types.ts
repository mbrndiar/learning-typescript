// Reusable typed code should preserve information instead of erasing it. The
// generic helper below accepts many shapes but returns the exact shape it was
// given, while utility types derive related models from one source.
interface HasId {
  readonly id: string;
}

interface Product extends HasId {
  name: string;
  price: number;
  inStock: boolean;
}

type ProductLabel = Pick<Product, "id" | "name">;
// Only price and stock can be patched here; name and id stay outside this
// update boundary.
type ProductChanges = Partial<Pick<Product, "price" | "inStock">>;

function findById<T extends HasId>(values: readonly T[], id: string): T | undefined {
  return values.find((value) => value.id === id);
}

function applyProductChanges(product: Product, changes: ProductChanges): Product {
  // Spreading into a new object keeps callers from being surprised by mutation
  // of the original Product value they passed in.
  return { ...product, ...changes };
}

function formatLabel(label: ProductLabel): string {
  return `${label.name} [${label.id}]`;
}

const products: Product[] = [
  { id: "p1", name: "Notebook", price: 6, inStock: true },
  { id: "p2", name: "Pen", price: 2, inStock: false },
];
const found = findById(products, "p2");

if (found !== undefined) {
  const updated = applyProductChanges(found, { inStock: true });
  console.log(formatLabel(updated));
  console.log(`In stock: ${updated.inStock}`);
}
