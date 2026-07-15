const unitPrice = 7.5;
const quantityText = "4";
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
console.log(`Numeric quantity equals 4: ${quantity === 4}`);
console.log(`Text quantity equals number 4: ${quantityText === String(4)}`);
console.log(`String joining: ${quantityText + 1}`);
console.log(`Numeric addition: ${quantity + 1}`);
