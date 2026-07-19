// This lesson shows arithmetic and comparison operators, deliberate value
// conversion, and why `+` is the one operator whose meaning depends on the
// types of its operands (numeric addition versus string joining).

// Money is held as integer cents so decimal binary approximations do not
// accumulate inside the calculation. Divide only when formatting for people.
const unitPriceCents = 750;
const quantityText = "4";
// Number() converts the text to a number explicitly. Doing the conversion up
// front is clearer than relying on JavaScript to coerce it later, which can
// surprise you (see the last two lines).
const quantity = Number(quantityText);
const subtotalCents = unitPriceCents * quantity;
const discountCents = 500;
const totalCents = subtotalCents - discountCents;

console.log(`Subtotal: $${(subtotalCents / 100).toFixed(2)}`);
console.log(`Total after discount: $${(totalCents / 100).toFixed(2)}`);
console.log(`Items: ${String(quantity)}`);

const hasSeveralItems = quantity >= 3;
const qualifiesForDiscount = hasSeveralItems && totalCents > 2_000;

console.log(`Several items: ${hasSeveralItems}`);
console.log(`Discount rules met: ${qualifiesForDiscount}`);
// === compares without converting types, so "4" is not equal to the number 4.
// Prefer it over == so comparisons never trigger a surprising conversion.
console.log(`Numeric quantity equals 4: ${quantity === 4}`);
console.log(`Text quantity equals number 4: ${quantityText === String(4)}`);
// The surprise of `+`: with a string on either side it joins text, so
// "4" + 1 is "41". With two numbers it adds, so 4 + 1 is 5.
console.log(`String joining: ${quantityText + 1}`);
console.log(`Numeric addition: ${quantity + 1}`);

// Decimal fractions such as 0.1 are approximations in binary64. Integers remain
// exact only through Number.MAX_SAFE_INTEGER; bigint extends exact integer range
// but is a distinct type and cannot be mixed directly with number.
console.log(`0.1 + 0.2: ${0.1 + 0.2}`);
console.log(`Largest safe integer: ${Number.MAX_SAFE_INTEGER}`);
console.log(
  `Still safe after adding one: ${Number.isSafeInteger(Number.MAX_SAFE_INTEGER + 1)}`,
);
console.log(`Exact large integer type: ${typeof 9_007_199_254_740_992n}`);
