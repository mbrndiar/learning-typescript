// TypeScript migration keeps the JavaScript runtime model, but adds checked
// contracts at boundaries. Let obvious local values be inferred, and annotate
// the places where callers need a promise about valid input and output.
const courseName = "TypeScript Foundations";
const lessonNumber = 4;
const isStrict = true;

// Parameters are a boundary: without annotations, JavaScript would accept any
// values here and discover mistakes only when multiplication behaves oddly.
function lineTotal(price: number, quantity: number): number {
  return price * quantity;
}

const quantities: number[] = [2, 1, 3];
// A readonly tuple is not "just an array": each position has a meaning, and the
// readonly marker prevents later code from swapping the name and price.
const featuredItem: readonly [name: string, price: number] = ["Notebook", 6.5];
const [itemName, itemPrice] = featuredItem;

let totalUnits = 0;

for (const quantity of quantities) {
  totalUnits += quantity;
}

console.log(`${courseName} is lesson ${lessonNumber}.`);
console.log(`Strict checking enabled: ${isStrict}`);
console.log(`${itemName}: $${lineTotal(itemPrice, totalUnits).toFixed(2)}`);
