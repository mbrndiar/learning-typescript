// Integer cents keep the calculation exact; division happens only at the
// display boundary where two decimal places are required.
export function buildPurchaseSummary(itemName, unitPriceCents, quantityText) {
  const quantity = Number(quantityText);
  const totalCents = unitPriceCents * quantity;
  const unitPrice = unitPriceCents / 100;
  const total = totalCents / 100;

  return `${quantity} × ${itemName} at $${unitPrice.toFixed(2)} = $${total.toFixed(2)}`;
}
