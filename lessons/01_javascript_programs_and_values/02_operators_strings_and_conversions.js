import { log } from "node:console";

const unitPrice = 7.5;
const quantityText = "4";
const quantity = Number(quantityText);
const subtotal = unitPrice * quantity;
const discount = 5;
const total = subtotal - discount;

log(`Subtotal: $${subtotal.toFixed(2)}`);
log(`Total after discount: $${total.toFixed(2)}`);
log(`Items: ${String(quantity)}`);

const hasSeveralItems = quantity >= 3;
const qualifiesForDiscount = hasSeveralItems && total > 20;

log(`Several items: ${hasSeveralItems}`);
log(`Discount rules met: ${qualifiesForDiscount}`);
log(`Numeric quantity equals 4: ${quantity === 4}`);
log(`Text quantity equals number 4: ${quantityText === String(4)}`);
log(`String joining: ${quantityText + 1}`);
log(`Numeric addition: ${quantity + 1}`);
