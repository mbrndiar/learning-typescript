// This lesson shows functions with default parameters, closures, and the
// difference between block and function scope. The key idea is the closure:
// `createCounter` returns a function that keeps using the `count` binding from
// the call that created it, even after that call has already returned.

// taxRate defaults to 0.2 when the caller omits it, so priceWithTax(10) and
// priceWithTax(10, 0.2) behave the same.
function priceWithTax(price, taxRate = 0.2) {
  return price * (1 + taxRate);
}

function createCounter(start = 0) {
  // Each call to createCounter gets its own `count`. The returned function
  // "closes over" that variable, giving it private, persistent state that no
  // other code can reach directly.
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
  // `message` here is scoped to this block, so it exists only between these
  // braces.
  const message = "Tax increased the price.";
  console.log(message);
}

// This is a separate binding that happens to share the name; the block-scoped
// one above went out of scope at the closing brace and never conflicts.
const message = "This is a different binding outside the block.";
console.log(message);
