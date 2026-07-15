// This lesson shows arithmetic and comparison operators, deliberate value
// conversion, and why `+` is the one operator whose meaning depends on the
// types of its operands (numeric addition versus string joining).

const unitPrice = 7.5;
const quantityText = "4";
// Number() converts the text to a number explicitly. Doing the conversion up
// front is clearer than relying on JavaScript to coerce it later, which can
// surprise you (see the last two lines).
const quantity = Number(quantityText);
const subtotal = unitPrice * quantity;
const discount = 5;
const total = subtotal - discount;

console.log(`Subtotal: $${subtotal.toFixed(2)}`);
console.log(`Total after discount: $${total.toFixed(2)}`);
console.log(`Items: ${String(quantity)}`);

const hasSeveralItems = quantity >= 3;
const qualifiesForDiscount = hasSeveralItems && total > 20;

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
