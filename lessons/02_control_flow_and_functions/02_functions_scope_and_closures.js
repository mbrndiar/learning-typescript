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
console.log(`Standard tax total: ${firstTotal.toFixed(2)}`);
console.log(`Reduced tax total: ${reducedTaxTotal.toFixed(2)}`);

const nextVisitNumber = createCounter(40);
console.log(nextVisitNumber());
console.log(nextVisitNumber());

if (firstTotal > 10) {
  const message = "Tax increased the price.";
  console.log(message);
}

const message = "This is a different binding outside the block.";
console.log(message);
