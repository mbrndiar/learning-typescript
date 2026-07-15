// Reference solution for delivery states. Each union member carries only the
// fields that are valid for that state, so narrowing replaces defensive
// optional-property checks throughout the rest of the code.
export type Delivery =
  | { readonly state: "preparing" }
  | { readonly state: "shipped"; readonly trackingNumber: string }
  | { readonly state: "delivered"; readonly receivedBy?: string };

// Order identity and customer are stable through this module; delivery changes
// should be represented by creating a new Order value rather than mutating one.
export interface Order {
  readonly id: string;
  readonly customer: string;
  readonly delivery: Delivery;
  readonly note?: string;
}

// This helper makes the switch exhaustive at compile time and still fails
// loudly if unchecked data somehow reaches the default branch at runtime.
function assertNever(value: never): never {
  throw new Error(`Unhandled delivery: ${JSON.stringify(value)}`);
}

// Describe the valid data for the current delivery state.
export function describeDelivery(delivery: Delivery): string {
  switch (delivery.state) {
    case "preparing":
      return "Preparing order";
    case "shipped":
      return `Shipped with tracking ${delivery.trackingNumber}`;
    case "delivered":
      // Check for undefined specifically so an empty receivedBy string remains
      // a present value instead of being treated as missing by truthiness.
      return delivery.receivedBy === undefined
        ? "Delivered"
        : `Delivered to ${delivery.receivedBy}`;
    default:
      return assertNever(delivery);
  }
}

// Include optional note text only when the caller supplied it.
export function summarizeOrder(order: Order): string {
  const summary = `${order.id}: ${order.customer} - ${describeDelivery(order.delivery)}`;

  if (order.note === undefined) {
    return summary;
  }

  return `${summary} (note: ${order.note})`;
}
