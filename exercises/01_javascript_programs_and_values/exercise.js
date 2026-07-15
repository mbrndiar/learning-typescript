export function buildPurchaseSummary(itemName, unitPrice, quantityText) {
  // TODO: Convert quantityText, calculate the total, and format both prices.
  return `${quantityText} × ${itemName} at ${unitPrice}`;
}
