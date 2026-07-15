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
  switch (delivery.state) {
    case "preparing":
      return "Preparing order";
    case "shipped":
      return `Shipped with tracking ${delivery.trackingNumber}`;
    case "delivered":
      return delivery.receivedBy === undefined
        ? "Delivered"
        : `Delivered to ${delivery.receivedBy}`;
    default:
      return assertNever(delivery);
  }
}

export function summarizeOrder(order: Order): string {
  const summary = `${order.id}: ${order.customer} - ${describeDelivery(order.delivery)}`;

  if (order.note === undefined) {
    return summary;
  }

  return `${summary} (note: ${order.note})`;
}
