import type { OrderStatus } from "@/types/order";

/** The six fulfilment states used by Phase 7. */
export const ORDER_STATUSES: readonly OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

/** Kept only so legacy rows can still be displayed; never a new target. */
export const LEGACY_ORDER_STATUSES: readonly OrderStatus[] = ["returned"];

/**
 * Admin-facing fulfilment transitions. Terminal states cannot be changed, and
 * an order cannot move backwards through the normal pipeline. `returned` is a
 * legacy terminal state and is not offered as a target.
 */
const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  returned: [],
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    ([...ORDER_STATUSES, ...LEGACY_ORDER_STATUSES] as readonly string[]).includes(
      value,
    )
  );
}

export function getAllowedOrderStatuses(
  current: OrderStatus,
): readonly OrderStatus[] {
  return ORDER_TRANSITIONS[current] ?? [];
}

export function canChangeOrderStatus(
  current: OrderStatus,
  next: OrderStatus,
): boolean {
  return next === current || getAllowedOrderStatuses(current).includes(next);
}

/** Customers may request cancellation only before the order has shipped. */
export function isCustomerCancellableStatus(status: OrderStatus): boolean {
  return status === "pending" || status === "confirmed" || status === "processing";
}
