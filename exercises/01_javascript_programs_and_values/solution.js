// Reference solution: converts the text quantity to a number so `*` performs
// arithmetic (not string joining) and formats currency with toFixed(2).
export function buildPurchaseSummary(itemName, unitPrice, quantityText) {
  const quantity = Number(quantityText);
  const total = unitPrice * quantity;

  return `${quantity} × ${itemName} at $${unitPrice.toFixed(2)} = $${total.toFixed(2)}`;
}
