import { log } from "node:console";

interface HasId {
  readonly id: string;
}

interface Product extends HasId {
  name: string;
  price: number;
  inStock: boolean;
}

type ProductLabel = Pick<Product, "id" | "name">;
type ProductChanges = Partial<Pick<Product, "price" | "inStock">>;

function findById<T extends HasId>(values: readonly T[], id: string): T | undefined {
  return values.find((value) => value.id === id);
}

function applyProductChanges(product: Product, changes: ProductChanges): Product {
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
  log(formatLabel(updated));
  log(`In stock: ${updated.inStock}`);
}
