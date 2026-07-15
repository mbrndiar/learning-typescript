export function buildPurchaseSummary(itemName, unitPrice, quantityText) {
  const quantity = Number(quantityText);
  const total = unitPrice * quantity;

  return `${quantity} × ${itemName} at $${unitPrice.toFixed(2)} = $${total.toFixed(2)}`;
}
