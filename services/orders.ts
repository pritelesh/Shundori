import "server-only";

import {
  canChangeOrderStatus,
  ORDER_STATUSES,
} from "@/lib/order-status";
import {
  getAuthenticatedUser,
  requireAdmin,
} from "@/services/authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CourierShipmentRow,
  OrderItemRow,
  OrderRow,
  OrderStatusChangeRow,
} from "@/types/database";
import type {
  Address,
  AdminOrder,
  AdminOrderDetails,
  CourierSummary,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusChangeEntry,
} from "@/types/order";

const ORDER_SELECT = "*, order_items(*)";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(id: string): void {
  if (!UUID_PATTERN.test(id)) {
    throw new Error("A valid order id is required.");
  }
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toAddress(
  value: unknown,
  row?: Pick<OrderRow, "customer_name" | "customer_phone">,
): Address {
  const record = (value && typeof value === "object" ? value : {}) as Partial<Address>;

  return {
    fullName: toString(record.fullName) || toString(row?.customer_name),
    phone: toString(record.phone) || toString(row?.customer_phone),
    email: typeof record.email === "string" ? record.email : null,
    addressLine1: toString(record.addressLine1),
    addressLine2: typeof record.addressLine2 === "string" ? record.addressLine2 : null,
    area: typeof record.area === "string" ? record.area : null,
    division:
      typeof record.division === "string" ? record.division : record.area ?? null,
    upazila: typeof record.upazila === "string" ? record.upazila : record.area ?? null,
    district: toString(record.district),
    postalCode: typeof record.postalCode === "string" ? record.postalCode : null,
    country: toString(record.country) || "Bangladesh",
  };
}

function toOrderItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    productName: row.product_name,
    variantLabel: row.variant_label,
    unitPrice: row.unit_price,
    quantity: row.quantity,
    lineTotal: row.total_price,
    imageUrl: row.product_image,
  };
}

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerId: row.customer_id,
    status: row.order_status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    subtotal: row.subtotal,
    shippingFee: row.delivery_charge,
    discountTotal: row.discount,
    total: row.total_amount,
    currency: "BDT",
    shippingAddress: toAddress(row.delivery_address, row),
    notes: row.notes,
    items: (row.order_items ?? []).map(toOrderItem),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAdminOrder(row: OrderRow): AdminOrder {
  return {
    ...toOrder(row),
    cancellationStatus: row.cancellation_status ?? "none",
    cancellationRequestedAt: row.cancellation_requested_at ?? null,
    cancellationReason: row.cancellation_reason ?? null,
    cancellationDecidedAt: row.cancellation_decided_at ?? null,
    cancellationDecidedBy: row.cancellation_decided_by ?? null,
    cancellationDecisionNote: row.cancellation_decision_note ?? null,
    cancellationStockRestored: row.cancellation_stock_restored ?? false,
  };
}

function toStatusChange(row: OrderStatusChangeRow): OrderStatusChangeEntry {
  return {
    id: row.id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    actorType: row.actor_type,
    actorId: row.actor_id,
    note: row.note,
    createdAt: row.created_at,
  };
}

function toCourier(row: CourierShipmentRow | null): CourierSummary {
  if (!row) return { state: "not_connected" };

  return {
    state: "connected",
    provider: row.provider,
    providerShipmentId: row.provider_shipment_id,
    providerStatus: row.provider_status,
    trackingUrl: row.tracking_url,
    estimatedDeliveryAt: row.estimated_delivery_at,
  };
}

function messageOf(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "";
}

/** Maps database errors to short, operator-safe messages. */
function mapOrderRpcError(error: unknown, fallback: string): Error {
  const detail = messageOf(error);

  if (detail.includes("Cannot change an order")) {
    return new Error("That status change is not allowed for this order.");
  }
  if (detail.includes("Decide the pending cancellation request")) {
    return new Error("Decide the pending cancellation request first.");
  }
  if (detail.includes("no longer available")) {
    return new Error(
      "A product for this order is no longer available; stock cannot be restored.",
    );
  }
  if (detail.includes("no pending cancellation request")) {
    return new Error("There is no pending cancellation request for this order.");
  }
  if (detail.includes("Only cancelled orders restore stock")) {
    return new Error("Only cancelled orders can restore stock.");
  }

  console.error("Order mutation failed", error);
  return new Error(fallback);
}

function cleanNote(note: string | undefined): string | null {
  const trimmed = (note ?? "").trim();
  return trimmed ? trimmed.slice(0, 500) : null;
}

async function readAdminOrderRow(id: string): Promise<OrderRow> {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .maybeSingle<OrderRow>();

  if (error) throw error;
  if (!data) throw new Error("Order not found.");
  return data;
}

/** Orders belonging to the signed-in customer only; RLS provides a second boundary. */
export async function listCurrentCustomerOrders(): Promise<Order[]> {
  const user = await getAuthenticatedUser();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data as OrderRow[]).map(toOrder);
}

export async function getCurrentCustomerOrder(id: string): Promise<Order | null> {
  assertUuid(id);
  const user = await getAuthenticatedUser();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .eq("customer_id", user.id)
    .maybeSingle<OrderRow>();

  if (error) throw error;

  return data ? toOrder(data) : null;
}

/** Admin-only order listing. The service-role client is used after an explicit role check. */
export async function listAllOrdersForAdmin(): Promise<AdminOrder[]> {
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data as OrderRow[]).map(toAdminOrder);
}

export async function getAdminOrder(id: string): Promise<AdminOrder | null> {
  assertUuid(id);
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .maybeSingle<OrderRow>();

  if (error) throw error;
  return data ? toAdminOrder(data) : null;
}

/** Status history and courier data are fetched separately and mapped to domain types. */
export async function getAdminOrderDetails(
  id: string,
): Promise<AdminOrderDetails | null> {
  assertUuid(id);
  await requireAdmin();
  const supabase = createAdminSupabaseClient();

  const [orderResult, historyResult, courierResult] = await Promise.all([
    supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("id", id)
      .maybeSingle<OrderRow>(),
    supabase
      .from("order_status_changes")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("courier_shipments")
      .select("*")
      .eq("order_id", id)
      .maybeSingle<CourierShipmentRow>(),
  ]);

  if (orderResult.error) throw orderResult.error;
  if (historyResult.error) throw historyResult.error;
  if (courierResult.error) throw courierResult.error;
  if (!orderResult.data) return null;

  return {
    order: toAdminOrder(orderResult.data),
    statusHistory: (historyResult.data as OrderStatusChangeRow[]).map(toStatusChange),
    courier: toCourier(courierResult.data),
  };
}

/**
 * Admin-only status transition through the atomic database function. Payment
 * status and monetary fields are never accepted from this API, so a client
 * cannot mark an order paid or change a price. Cancelling restores stock once.
 */
export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  note?: string,
): Promise<AdminOrder> {
  assertUuid(id);
  if (!ORDER_STATUSES.includes(status)) {
    throw new Error("Unsupported order status.");
  }

  const identity = await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc("set_order_status", {
    p_order_id: id,
    p_status: status,
    p_actor_id: identity.user.id,
    p_note: cleanNote(note),
  });

  if (error) throw mapOrderRpcError(error, "The order status could not be updated.");

  return toAdminOrder(await readAdminOrderRow(id));
}

export async function decideOrderCancellation(
  id: string,
  approve: boolean,
  note?: string,
): Promise<AdminOrder> {
  assertUuid(id);
  const identity = await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.rpc("decide_order_cancellation", {
    p_order_id: id,
    p_approve: approve,
    p_actor_id: identity.user.id,
    p_note: cleanNote(note),
  });

  if (error) throw mapOrderRpcError(error, "The cancellation could not be decided.");

  return toAdminOrder(await readAdminOrderRow(id));
}

/**
 * Exported for tests only. The database enforces the same rules independently.
 */
export function isValidAdminTransition(
  current: OrderStatus,
  next: OrderStatus,
): boolean {
  return canChangeOrderStatus(current, next);
}
