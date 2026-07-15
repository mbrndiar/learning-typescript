// Starter for modeling delivery states. The goal is to make impossible states
// unrepresentable instead of storing every possible field on one loose object.
export type Delivery =
  | { readonly state: "preparing" }
  | { readonly state: "shipped"; readonly trackingNumber: string }
  | { readonly state: "delivered"; readonly receivedBy?: string };

// Order owns a Delivery value and exposes identity as readonly. `note?` is
// optional because an order without a note is still complete and valid.
export interface Order {
  readonly id: string;
  readonly customer: string;
  readonly delivery: Delivery;
  readonly note?: string;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled delivery: ${JSON.stringify(value)}`);
}

// Return the user-facing text for exactly the data carried by each state.
export function describeDelivery(delivery: Delivery): string {
  // TODO: Return state-specific text from every branch.
  switch (delivery.state) {
    case "preparing":
      return "TODO: preparing";
    case "shipped":
      return `TODO: ${delivery.trackingNumber}`;
    case "delivered":
      return delivery.receivedBy ?? "TODO: delivered";
    default:
      return assertNever(delivery);
  }
}

// Summaries should not invent a note when the optional property is absent.
export function summarizeOrder(order: Order): string {
  // TODO: Include the optional note only when it exists.
  return `${order.id}: ${order.customer} - ${describeDelivery(order.delivery)}`;
}
