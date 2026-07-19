// Contract: return a summary line for buying `quantityText` items. The price is
// integer cents so arithmetic stays exact; divide only at the display boundary.
export function buildPurchaseSummary(itemName, unitPriceCents, quantityText) {
  // TODO: Convert quantityText, calculate total cents, and format both prices.
  return `${quantityText} × ${itemName} at ${unitPriceCents}`;
}
