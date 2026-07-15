import { log } from "node:console";

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

log(`${courseName} is lesson ${lessonNumber}.`);
log(`Strict checking enabled: ${isStrict}`);
log(`${itemName}: $${lineTotal(itemPrice, totalUnits).toFixed(2)}`);
