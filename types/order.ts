import type { Poisha } from "@/types/product";

export interface Address {
  fullName: string;
  phone: string;
  email: string | null;
  addressLine1: string;
  addressLine2: string | null;
  /** Legacy locality field. Checkout writes the upazila here as well. */
  area: string | null;
  /** Bangladesh division captured at checkout. Older orders may omit it. */
  division?: string | null;
  /** Bangladesh upazila captured at checkout. Older orders may omit it. */
  upazila?: string | null;
  district: string;
  postalCode: string | null;
  country: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentStatus = "unpaid" | "paid" | "refunded" | "failed";

export type CancellationStatus = "none" | "requested" | "approved" | "rejected";

export type CourierProvider = "pathao" | "steadfast" | "redx";

export type PaymentMethod =
  | "cash_on_delivery"
  | "bkash"
  | "nagad"
  | "sslcommerz"
  | "card"
  | "bank_transfer";

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string;
  variantLabel: string | null;
  unitPrice: Poisha;
  quantity: number;
  lineTotal: Poisha;
  imageUrl: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  /** Null for guest checkout orders. */
  customerId: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  subtotal: Poisha;
  shippingFee: Poisha;
  discountTotal: Poisha;
  total: Poisha;
  currency: "BDT";
  shippingAddress: Address;
  notes: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrder extends Order {
  cancellationStatus: CancellationStatus;
  cancellationRequestedAt: string | null;
  cancellationReason: string | null;
  cancellationDecidedAt: string | null;
  cancellationDecidedBy: string | null;
  cancellationDecisionNote: string | null;
  cancellationStockRestored: boolean;
}

export interface OrderStatusChangeEntry {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorType: "system" | "admin" | "customer";
  actorId: string | null;
  note: string | null;
  createdAt: string;
}

export interface CourierSummary {
  state: "not_connected" | "connected";
  provider?: CourierProvider;
  providerShipmentId?: string | null;
  providerStatus?: string | null;
  trackingUrl?: string | null;
  estimatedDeliveryAt?: string | null;
}

export interface AdminOrderDetails {
  order: AdminOrder;
  statusHistory: OrderStatusChangeEntry[];
  courier: CourierSummary;
}

export interface TrackedOrderItem {
  productName: string;
  quantity: number;
  unitPrice: Poisha;
  lineTotal: Poisha;
}

/** Deliberately excludes customer identity, address and order totals. */
export interface TrackedOrder {
  orderNumber: string;
  status: OrderStatus;
  placedAt: string;
  paymentMethod: PaymentMethod;
  estimatedDeliveryAt: string | null;
  cancellationStatus: CancellationStatus;
  cancellationRequestedAt: string | null;
  courier: CourierSummary;
  items: TrackedOrderItem[];
}
