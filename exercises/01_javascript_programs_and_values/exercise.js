// Contract: return a summary line for buying `quantityText` items. Note the
// quantity arrives as text and must become a number before any arithmetic,
// and both prices should be formatted with two decimals.
export function buildPurchaseSummary(itemName, unitPrice, quantityText) {
  // TODO: Convert quantityText, calculate the total, and format both prices.
  return `${quantityText} × ${itemName} at ${unitPrice}`;
}
