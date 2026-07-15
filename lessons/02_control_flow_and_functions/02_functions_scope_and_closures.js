import { log } from "node:console";

function priceWithTax(price, taxRate = 0.2) {
  return price * (1 + taxRate);
}

function createCounter(start = 0) {
  let count = start;

  return function increment() {
    count += 1;
    return count;
  };
}

const firstTotal = priceWithTax(10);
const reducedTaxTotal = priceWithTax(10, 0.1);
log(`Standard tax total: ${firstTotal.toFixed(2)}`);
log(`Reduced tax total: ${reducedTaxTotal.toFixed(2)}`);

const nextVisitNumber = createCounter(40);
log(nextVisitNumber());
log(nextVisitNumber());

if (firstTotal > 10) {
  const message = "Tax increased the price.";
  log(message);
}

const message = "This is a different binding outside the block.";
log(message);
