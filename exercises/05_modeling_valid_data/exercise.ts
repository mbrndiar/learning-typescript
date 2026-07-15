export type Delivery =
  | { readonly state: "preparing" }
  | { readonly state: "shipped"; readonly trackingNumber: string }
  | { readonly state: "delivered"; readonly receivedBy?: string };

export interface Order {
  readonly id: string;
  readonly customer: string;
  readonly delivery: Delivery;
  readonly note?: string;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled delivery: ${JSON.stringify(value)}`);
}

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

export function summarizeOrder(order: Order): string {
  // TODO: Include the optional note only when it exists.
  return `${order.id}: ${order.customer} - ${describeDelivery(order.delivery)}`;
}
