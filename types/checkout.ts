import type {
  Address,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/types/order";
import type { Poisha, ProductTone, ProductVisualShape } from "@/types/product";

/** A browser-supplied cart line. Prices and names are never accepted here. */
export interface CheckoutLine {
  productId: string;
  quantity: number;
}

export interface CheckoutItem extends CheckoutLine {
  name: string;
  slug: string;
  brandName: string | null;
  imageUrl: string | null;
  visual: ProductVisualShape;
  tone: ProductTone;
  /** Authoritative current selling price in poisha. */
  unitPrice: Poisha;
  lineTotal: Poisha;
  availableStock: number;
  requestedQuantity: number;
}

export interface CheckoutQuote {
  items: CheckoutItem[];
  /** Products that are inactive, missing, or out of stock. */
  unavailable: string[];
  /** Human-readable notes where stock clamped a requested quantity. */
  adjustments: string[];
  subtotal: Poisha;
  deliveryCharge: Poisha;
  discount: Poisha;
  total: Poisha;
  totalQuantity: number;
  /** Coupon fields are derived server-side and never trusted from the browser. */
  couponCode: string | null;
  couponDiscount: Poisha;
  couponMessage: string | null;
}

export interface CheckoutCustomerInput {
  fullName: string;
  phone: string;
  email: string | null;
  division: string;
  district: string;
  upazila: string;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string | null;
  notes: string | null;
}

export interface CheckoutAddress extends Address {
  division: string;
  upazila: string;
}

export interface PlaceCodOrderInput {
  customer: CheckoutCustomerInput;
  lines: CheckoutLine[];
  idempotencyKey: string;
  couponCode?: string | null;
}

export interface PlaceOrderResult {
  orderId: string;
  orderNumber: string;
  confirmationToken: string;
  subtotal: Poisha;
  deliveryCharge: Poisha;
  discount: Poisha;
  total: Poisha;
  couponCode: string | null;
}

export interface OrderConfirmationItem {
  id: string;
  productId: string | null;
  productName: string;
  productImage: string | null;
  imageUrl: string | null;
  unitPrice: Poisha;
  quantity: number;
  lineTotal: Poisha;
}

export interface OrderConfirmation {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  deliveryAddress: Address;
  subtotal: Poisha;
  deliveryCharge: Poisha;
  discount: Poisha;
  total: Poisha;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  notes: string | null;
  createdAt: string;
  items: OrderConfirmationItem[];
}

export type CheckoutActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface CheckoutMutationState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors: Record<string, string>;
  orderNumber?: string;
  confirmationToken?: string;
}
