const courseName = "TypeScript Foundations";
const lessonNumber = 4;
const isStrict = true;

function lineTotal(price: number, quantity: number): number {
  return price * quantity;
}

const quantities: number[] = [2, 1, 3];
const featuredItem: readonly [name: string, price: number] = ["Notebook", 6.5];
const [itemName, itemPrice] = featuredItem;

let totalUnits = 0;

for (const quantity of quantities) {
  totalUnits += quantity;
}

console.log(`${courseName} is lesson ${lessonNumber}.`);
console.log(`Strict checking enabled: ${isStrict}`);
console.log(`${itemName}: $${lineTotal(itemPrice, totalUnits).toFixed(2)}`);
