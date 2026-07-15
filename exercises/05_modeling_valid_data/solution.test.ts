import assert from "node:assert/strict";
import test from "node:test";

import { describeDelivery, summarizeOrder, type Order } from "./solution.ts";

test("describes each discriminated delivery state", () => {
  assert.equal(describeDelivery({ state: "preparing" }), "Preparing order");
  assert.equal(
    describeDelivery({ state: "shipped", trackingNumber: "TRACK-1" }),
    "Shipped with tracking TRACK-1",
  );
  assert.equal(describeDelivery({ state: "delivered" }), "Delivered");
  assert.equal(
    describeDelivery({ state: "delivered", receivedBy: "Ada" }),
    "Delivered to Ada",
  );
});

test("summarizes orders with and without optional notes", () => {
  const preparing: Order = {
    id: "order-1",
    customer: "Lin",
    delivery: { state: "preparing" },
  };
  const delivered: Order = {
    id: "order-2",
    customer: "Ada",
    delivery: { state: "delivered", receivedBy: "Grace" },
    note: "Leave at reception",
  };

  assert.equal(summarizeOrder(preparing), "order-1: Lin - Preparing order");
  assert.equal(
    summarizeOrder(delivered),
    "order-2: Ada - Delivered to Grace (note: Leave at reception)",
  );
});
