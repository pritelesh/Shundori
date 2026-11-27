import type {
  Address,
  CancellationStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/types/order";
import type { ProductTone, ProductVisualShape } from "@/types/product";

/**
 * Minimal row shapes used by services to map Supabase responses into domain
 * types. These are intentionally narrow: replace this file with the generated
 * `types/database.ts` once a live project is available (`supabase gen types`).
 */

export type ProfileRole = "customer" | "admin" | "staff";

/** PostgREST may infer to-one embeds as arrays until generated types exist. */
export type Relation<T> = T | T[] | null;

export interface ProfileRow {
  id: string;
  full_name: string;
  phone: string | null;
  email: string;
  role: ProfileRole;
  created_at: string;
  updated_at: string;
}

export interface BrandRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  brand_id: string;
  category_id: string | null;
  description: string | null;
  short_description: string | null;
  regular_price: number;
  sale_price: number | null;
  /** Present after migration 0010. */
  sale_starts_at?: string | null;
  sale_ends_at?: string | null;
  discount_percentage?: number;
  low_stock_threshold?: number;
  stock_quantity: number;
  /** JSON array of Storage object paths (or full URLs) in display order. */
  images: unknown;
  ingredients: unknown;
  benefits: unknown;
  usage_instructions: unknown;
  expiry_date: string | null;
  is_featured: boolean;
  is_active: boolean;
  visual: ProductVisualShape;
  tone: ProductTone;
  created_at: string;
  updated_at: string;
  brands?: Relation<Pick<BrandRow, "id" | "name" | "slug" | "logo_url">>;
  categories?: Relation<Pick<CategoryRow, "id" | "name" | "slug" | "image_url">>;
}

export interface InventoryChangeRow {
  id: string;
  product_id: string;
  previous_quantity: number;
  new_quantity: number;
  delta: number;
  reason: string;
  changed_by: string | null;
  created_at: string;
}

export interface OrderRow {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  delivery_address: Address;
  subtotal: number;
  delivery_charge: number;
  discount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  notes: string | null;
  /** Present after migration 0007; used for duplicate-safe checkout retries. */
  idempotency_key?: string | null;
  idempotency_fingerprint?: string | null;
  confirmation_token?: string;
  /** Present after migration 0008. */
  cancellation_status?: CancellationStatus;
  cancellation_requested_at?: string | null;
  cancellation_reason?: string | null;
  cancellation_decided_at?: string | null;
  cancellation_decided_by?: string | null;
  cancellation_decision_note?: string | null;
  cancellation_stock_restored?: boolean;
  /** Present after migration 0010. */
  coupon_code?: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItemRow[];
}

export interface StoreSettingsRow {
  key: string;
  /** JSON scalar/object payload. Delivery charge is stored as integer poisha. */
  value: unknown;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  variant_label: string | null;
  unit_price: number;
  quantity: number;
  total_price: number;
}

export interface OrderStatusChangeRow {
  id: string;
  order_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  actor_type: "system" | "admin" | "customer";
  actor_id: string | null;
  note: string | null;
  created_at: string;
}

export interface CourierShipmentRow {
  id: string;
  order_id: string;
  provider: "pathao" | "steadfast" | "redx";
  provider_shipment_id: string | null;
  provider_status: string | null;
  tracking_url: string | null;
  estimated_delivery_at: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}
