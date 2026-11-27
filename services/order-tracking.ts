import "server-only";

import {
  readTrackingInput,
  TrackingValidationError,
} from "@/lib/order-tracking";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type {
  CancellationStatus,
  CourierSummary,
  OrderStatus,
  PaymentMethod,
  TrackedOrder,
  TrackedOrderItem,
} from "@/types/order";

interface TrackOrderRpc {
  orderNumber?: unknown;
  status?: unknown;
  placedAt?: unknown;
  paymentMethod?: unknown;
  estimatedDeliveryAt?: unknown;
  cancellationStatus?: unknown;
  cancellationRequestedAt?: unknown;
  courier?: unknown;
  items?: unknown;
}

interface TrackCourierRpc {
  state?: unknown;
  provider?: unknown;
  providerStatus?: unknown;
  trackingUrl?: unknown;
}

interface TrackItemRpc {
  productName?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  lineTotal?: unknown;
}

export class OrderTrackingError extends Error {
  constructor(message = "We couldn't look up that order. Please try again.") {
    super(message);
    this.name = "OrderTrackingError";
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function integer(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : 0;
}

function toCourier(value: unknown): CourierSummary {
  const record = (value && typeof value === "object" ? value : {}) as TrackCourierRpc;

  if (record.state !== "connected") return { state: "not_connected" };
  if (
    record.provider !== "pathao" &&
    record.provider !== "steadfast" &&
    record.provider !== "redx"
  ) {
    return { state: "not_connected" };
  }

  return {
    state: "connected",
    provider: record.provider,
    providerStatus: nullableText(record.providerStatus),
    trackingUrl: nullableText(record.trackingUrl),
  };
}

function toItems(value: unknown): TrackedOrderItem[] {
  if (!Array.isArray(value)) return [];

  return value.map((entry) => {
    const item = (entry && typeof entry === "object" ? entry : {}) as TrackItemRpc;
    return {
      productName: text(item.productName),
      quantity: integer(item.quantity),
      unitPrice: integer(item.unitPrice),
      lineTotal: integer(item.lineTotal),
    };
  }).filter((item) => item.productName && item.quantity > 0);
}

function toTrackedOrder(value: unknown): TrackedOrder | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as TrackOrderRpc;
  if (!text(record.orderNumber) || !text(record.status)) return null;

  return {
    orderNumber: text(record.orderNumber),
    status: record.status as OrderStatus,
    placedAt: text(record.placedAt),
    paymentMethod: record.paymentMethod as PaymentMethod,
    estimatedDeliveryAt: nullableText(record.estimatedDeliveryAt),
    cancellationStatus: (record.cancellationStatus ?? "none") as CancellationStatus,
    cancellationRequestedAt: nullableText(record.cancellationRequestedAt),
    courier: toCourier(record.courier),
    items: toItems(record.items),
  };
}

/**
 * Requires both the order number and the phone used at checkout. The RPC only
 * returns a privacy-safe DTO: no name, phone, email, address or order totals.
 */
export async function trackCustomerOrder(input: {
  orderNumber?: unknown;
  phone?: unknown;
}): Promise<TrackedOrder | null> {
  const { orderNumber, phone } = readTrackingInput(input);
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("track_order", {
    p_order_number: orderNumber,
    p_phone: phone,
  });

  if (error) {
    console.error("Order tracking lookup failed", error);
    throw new OrderTrackingError();
  }

  return toTrackedOrder(data);
}

export interface CancellationRequestResult {
  alreadyRequested: boolean;
  order: TrackedOrder | null;
}

export async function requestCustomerCancellation(input: {
  orderNumber?: unknown;
  phone?: unknown;
  reason?: unknown;
}): Promise<CancellationRequestResult> {
  const { orderNumber, phone } = readTrackingInput(input);
  const reason = text(input.reason).trim().slice(0, 500);

  if (!reason) {
    throw new TrackingValidationError({
      reason: "Tell us why you want to cancel this order.",
    });
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("request_order_cancellation", {
    p_order_number: orderNumber,
    p_phone: phone,
    p_reason: reason,
  });

  if (error) {
    const detail = error.message.toLowerCase();
    if (detail.includes("no matching order")) {
      throw new TrackingValidationError({
        orderNumber: "No matching order was found for those details.",
      });
    }
    if (detail.includes("can no longer be cancelled")) {
      throw new OrderTrackingError("This order can no longer be cancelled.");
    }
    if (detail.includes("already been recorded")) {
      throw new OrderTrackingError("A cancellation decision has already been recorded.");
    }

    console.error("Cancellation request failed", error);
    throw new OrderTrackingError("The cancellation request could not be submitted.");
  }

  const record = (data && typeof data === "object" ? data : {}) as {
    alreadyRequested?: unknown;
  };

  // Return the same privacy-safe DTO used by tracking so the customer's view
  // updates immediately after a request without another manual lookup.
  const order = await trackCustomerOrder({ orderNumber, phone });

  return { alreadyRequested: record.alreadyRequested === true, order };
}
