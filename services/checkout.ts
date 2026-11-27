import "server-only";

import { createHash } from "node:crypto";

import { hasSupabasePublicEnv } from "@/lib/env/public";
import { calculateQuoteTotals } from "@/lib/checkout-totals";
import { effectivePrice } from "@/lib/offer-pricing";
import {
  CheckoutValidationError,
  parseCheckoutLines,
  readIdempotencyKey,
  toCheckoutAddress,
} from "@/lib/checkout-validation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  fallbackTone,
  fallbackVisual,
  toImagePaths,
} from "@/services/parsers";
import type {
  CheckoutCustomerInput,
  CheckoutItem,
  CheckoutLine,
  CheckoutQuote,
  OrderConfirmation,
  OrderConfirmationItem,
  PlaceCodOrderInput,
  PlaceOrderResult,
} from "@/types/checkout";
import type { Relation } from "@/types/database";
import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "@/types/order";
import type { ProductTone, ProductVisualShape } from "@/types/product";

const PRODUCT_IMAGE_BUCKET = "product-images";

export class CheckoutError extends Error {
  readonly fieldErrors: Record<string, string>;

  constructor(
    message: string,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "CheckoutError";
    this.fieldErrors = fieldErrors;
  }
}

interface CheckoutProductRow {
  id: string;
  name: string;
  slug: string;
  regular_price: number;
  sale_price: number | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
  stock_quantity: number;
  images: unknown;
  visual: ProductVisualShape | null;
  tone: ProductTone | null;
  is_active: boolean;
  brands?: Relation<{ name: string }>;
}

interface CheckoutSettingsRpc {
  deliveryCharge?: unknown;
  discount?: unknown;
}

interface CouponValidationRpc {
  ok?: unknown;
  code?: unknown;
  discount?: unknown;
  message?: unknown;
}

interface CheckoutQuoteInput {
  lines: unknown;
  couponCode: string | null;
}

function readCheckoutQuoteInput(input: unknown): CheckoutQuoteInput {
  if (
    input &&
    typeof input === "object" &&
    !Array.isArray(input) &&
    "lines" in input
  ) {
    const candidate = input as { lines?: unknown; couponCode?: unknown };
    const code =
      typeof candidate.couponCode === "string"
        ? candidate.couponCode.trim().toUpperCase()
        : "";

    return {
      lines: candidate.lines ?? [],
      couponCode: code || null,
    };
  }

  return { lines: input, couponCode: null };
}

interface PlaceOrderRpc {
  orderId?: unknown;
  orderNumber?: unknown;
  confirmationToken?: unknown;
  subtotal?: unknown;
  deliveryCharge?: unknown;
  discount?: unknown;
  total?: unknown;
  couponCode?: unknown;
}

interface ConfirmationRpc {
  id: unknown;
  orderNumber: unknown;
  customerName: unknown;
  customerPhone: unknown;
  customerEmail: unknown;
  deliveryAddress: unknown;
  subtotal: unknown;
  deliveryCharge: unknown;
  discount: unknown;
  total: unknown;
  paymentMethod: unknown;
  paymentStatus: unknown;
  status: unknown;
  notes: unknown;
  createdAt: unknown;
  items?: unknown;
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

function firstRelation<T>(value: Relation<T> | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function positiveInteger(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : 0;
}

function imageUrl(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  value: unknown,
): string | null {
  const path = toImagePaths([value])[0];
  return path
    ? supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
    : null;
}

function orderFingerprint(
  customer: CheckoutCustomerInput,
  lines: readonly CheckoutLine[],
  couponCode: string | null,
): string {
  const canonical = {
    couponCode: couponCode ? couponCode.trim().toUpperCase() : null,
    customer: {
      fullName: customer.fullName.trim(),
      phone: customer.phone.trim(),
      email: customer.email?.trim() ?? null,
      division: customer.division.trim(),
      district: customer.district.trim(),
      upazila: customer.upazila.trim(),
      addressLine1: customer.addressLine1.trim(),
      addressLine2: customer.addressLine2?.trim() ?? null,
      postalCode: customer.postalCode?.trim() ?? null,
      notes: customer.notes?.trim() ?? null,
    },
    lines: [...lines]
      .map((line) => ({ productId: line.productId, quantity: line.quantity }))
      .sort((a, b) => a.productId.localeCompare(b.productId)),
    paymentMethod: "cash_on_delivery",
  };

  return createHash("sha256")
    .update(JSON.stringify(canonical))
    .digest("hex");
}

/** Builds a display-only quote from authoritative catalogue rows. */
export async function getCheckoutQuote(input: unknown): Promise<CheckoutQuote> {
  if (!hasSupabasePublicEnv()) {
    throw new CheckoutError(
      "Checkout needs Supabase credentials. Add the public Supabase values to .env.local, then restart the server.",
    );
  }

  const { lines: linesInput, couponCode } = readCheckoutQuoteInput(input);
  const lines = parseCheckoutLines(linesInput);
  const supabase = createPublicSupabaseClient();

  const [settingsResult, productsResult] = await Promise.all([
    supabase.rpc("get_checkout_settings"),
    supabase
      .from("products")
      .select(
        "id, name, slug, regular_price, sale_price, sale_starts_at, sale_ends_at, stock_quantity, images, visual, tone, is_active, brands(name)",
      )
      .in(
        "id",
        lines.map((line) => line.productId),
      )
      .eq("is_active", true),
  ]);

  if (settingsResult.error) throw settingsResult.error;
  if (productsResult.error) throw productsResult.error;

  const settings = (settingsResult.data ?? {}) as CheckoutSettingsRpc;
  const deliveryCharge = positiveInteger(settings.deliveryCharge);
  const storeDiscount = positiveInteger(settings.discount);

  const products = new Map<string, CheckoutProductRow>();
  for (const row of (productsResult.data ?? []) as CheckoutProductRow[]) {
    products.set(row.id, row);
  }

  const items: CheckoutItem[] = [];
  const unavailable: string[] = [];
  const adjustments: string[] = [];

  for (const line of lines) {
    const row = products.get(line.productId);
    if (!row || !row.is_active) {
      unavailable.push("A product in your bag is no longer available.");
      continue;
    }
    if (row.stock_quantity <= 0) {
      unavailable.push(`${row.name} is out of stock.`);
      continue;
    }

    const quantity = Math.min(line.quantity, row.stock_quantity);
    if (quantity < line.quantity) {
      adjustments.push(
        `${row.name}: quantity reduced to ${quantity} available units.`,
      );
    }

    // The same active-offer rule is enforced by place_cod_order().
    const unitPrice = effectivePrice(row);
    if (!Number.isInteger(unitPrice) || unitPrice < 0) {
      throw new CheckoutError("A product price is invalid.");
    }

    const lineTotal = unitPrice * quantity;

    items.push({
      productId: row.id,
      quantity,
      requestedQuantity: line.quantity,
      name: row.name,
      slug: row.slug,
      brandName: firstRelation(row.brands)?.name ?? null,
      imageUrl: imageUrl(supabase, row.images),
      visual: row.visual ?? fallbackVisual(row.slug),
      tone: row.tone ?? fallbackTone(row.slug),
      unitPrice,
      lineTotal,
      availableStock: row.stock_quantity,
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  let appliedCouponCode: string | null = null;
  let couponDiscount = 0;
  let couponMessage: string | null = null;

  if (couponCode && subtotal > 0) {
    const { data, error } = await supabase.rpc("validate_coupon", {
      p_code: couponCode,
      p_subtotal: subtotal,
    });

    if (error) throw error;
    const result = (data ?? {}) as CouponValidationRpc;
    if (result.ok === true) {
      appliedCouponCode =
        typeof result.code === "string" ? result.code : couponCode;
      couponDiscount = positiveInteger(result.discount);
      couponMessage = "Coupon applied.";
    } else {
      couponMessage =
        typeof result.message === "string" && result.message.trim()
          ? result.message
          : "That coupon could not be applied.";
    }
  } else if (couponCode) {
    couponMessage = "Add items to your bag before applying a coupon.";
  }

  const discount = couponDiscount + storeDiscount;
  const totals = calculateQuoteTotals(items, deliveryCharge, discount);

  return {
    items,
    unavailable,
    adjustments,
    subtotal: totals.subtotal,
    deliveryCharge,
    discount,
    total: totals.total,
    totalQuantity: totals.totalQuantity,
    couponCode: appliedCouponCode,
    couponDiscount,
    couponMessage,
  };
}

/**
 * Places a COD order through one atomic database function. Only ids and
 * quantities from the browser are used; all prices and totals come from Supabase.
 */
export async function placeCodOrder(
  input: PlaceCodOrderInput,
): Promise<PlaceOrderResult> {
  if (!hasSupabasePublicEnv()) {
    throw new CheckoutError(
      "Checkout needs Supabase credentials. Add the public Supabase values to .env.local, then restart the server.",
    );
  }

  const customer = input.customer;
  const lines = parseCheckoutLines(input.lines);
  const idempotencyKey = readIdempotencyKey(input.idempotencyKey);
  const couponCode = input.couponCode?.trim().toUpperCase() || null;

  if (!customer || typeof customer !== "object") {
    throw new CheckoutValidationError({
      checkout: "Complete the delivery details before placing your order.",
    });
  }

  const cookieClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await cookieClient.auth.getUser();
  const customerId = user?.id ?? null;

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("place_cod_order", {
    p_idempotency_key: idempotencyKey,
    p_idempotency_fingerprint: orderFingerprint(customer, lines, couponCode),
    p_customer_id: customerId,
    p_customer_name: customer.fullName,
    p_customer_phone: customer.phone,
    p_customer_email: customer.email,
    p_delivery_address: toCheckoutAddress(customer),
    p_notes: customer.notes,
    p_items: lines,
    p_changed_by: customerId,
    p_coupon_code: couponCode,
  });

  if (error) {
    // Never expose PostgREST/SQL details to the browser.
    console.error("COD order placement failed", error);
    const detail = messageOf(error).toLowerCase();

    if (detail.includes("insufficient stock")) {
      throw new CheckoutError(
        "One or more items no longer have enough stock. Return to your bag to update quantities.",
        { cart: "Stock changed. Please review your bag." },
      );
    }
    if (detail.includes("no longer available")) {
      throw new CheckoutError(
        "One or more products are no longer available. Please review your bag.",
        { cart: "A product is no longer available." },
      );
    }
    if (
      detail.includes("different details") ||
      detail.includes("already been used") ||
      detail.includes("could not be completed")
    ) {
      throw new CheckoutError(
        "This checkout request was already submitted. If you did not receive a confirmation, please contact support.",
        { checkout: "Duplicate checkout request." },
      );
    }
    if (
      detail.includes("coupon") ||
      detail.includes("minimum order") ||
      detail.includes("usage limit")
    ) {
      throw new CheckoutError(messageOf(error), {
        couponCode: messageOf(error),
      });
    }
    if (detail.includes("bag must contain") || detail.includes("invalid")) {
      throw new CheckoutError("Please review your bag and try again.", {
        cart: "Your bag contains an invalid item.",
      });
    }

    throw new CheckoutError(
      "We could not place your order right now. Please try again.",
    );
  }

  const result = (data ?? {}) as PlaceOrderRpc;
  if (
    typeof result.orderId !== "string" ||
    typeof result.orderNumber !== "string" ||
    typeof result.confirmationToken !== "string"
  ) {
    throw new CheckoutError(
      "The order was placed but its confirmation could not be read. Please contact support.",
    );
  }

  return {
    orderId: result.orderId,
    orderNumber: result.orderNumber,
    confirmationToken: result.confirmationToken,
    subtotal: positiveInteger(result.subtotal),
    deliveryCharge: positiveInteger(result.deliveryCharge),
    discount: positiveInteger(result.discount),
    total: positiveInteger(result.total),
    couponCode: typeof result.couponCode === "string" ? result.couponCode : null,
  };
}

function mapConfirmationItem(
  supabase: ReturnType<typeof createPublicSupabaseClient>,
  value: unknown,
): OrderConfirmationItem | null {
  const record = value && typeof value === "object" ? value : {};
  const id = "id" in record && typeof record.id === "string" ? record.id : "";
  const productName =
    "productName" in record && typeof record.productName === "string"
      ? record.productName
      : "";
  if (!id || !productName) return null;

  const productImage =
    "productImage" in record && typeof record.productImage === "string"
      ? record.productImage
      : null;

  return {
    id,
    productId:
      "productId" in record && typeof record.productId === "string"
        ? record.productId
        : null,
    productName,
    productImage,
    imageUrl: imageUrl(supabase, productImage),
    unitPrice:
      "unitPrice" in record && typeof record.unitPrice === "number"
        ? record.unitPrice
        : 0,
    quantity:
      "quantity" in record && typeof record.quantity === "number"
        ? record.quantity
        : 0,
    lineTotal:
      "lineTotal" in record && typeof record.lineTotal === "number"
        ? record.lineTotal
        : 0,
  };
}

/** Reads a confirmation only when both the order number and secret token match. */
export async function getOrderConfirmation(
  orderNumber: string,
  token: string,
): Promise<OrderConfirmation | null> {
  if (!/^SD-[A-Za-z0-9-]{8,48}$/.test(orderNumber)) return null;
  if (!/^[a-f0-9]{64}$/i.test(token)) return null;
  if (!hasSupabasePublicEnv()) {
    // Without a live project there can be no stored order to confirm. Treat
    // the link as unknown rather than leaking a configuration error.
    return null;
  }

  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc("get_order_confirmation", {
    p_order_number: orderNumber,
    p_confirmation_token: token,
  });

  if (error) throw error;
  if (!data || typeof data !== "object" || !("orderNumber" in data)) return null;

  const row = data as ConfirmationRpc;
  const address =
    row.deliveryAddress && typeof row.deliveryAddress === "object"
      ? (row.deliveryAddress as Record<string, unknown>)
      : {};
  const text = (value: unknown): string =>
    typeof value === "string" ? value : "";

  const items = Array.isArray(row.items)
    ? row.items
        .map((item) => mapConfirmationItem(supabase, item))
        .filter((item): item is OrderConfirmationItem => item !== null)
    : [];

  return {
    id: text(row.id),
    orderNumber: text(row.orderNumber),
    customerName: text(row.customerName),
    customerPhone: text(row.customerPhone),
    customerEmail:
      typeof row.customerEmail === "string" ? row.customerEmail : null,
    deliveryAddress: {
      fullName: text(address.fullName),
      phone: text(address.phone),
      email: typeof address.email === "string" ? address.email : null,
      addressLine1: text(address.addressLine1),
      addressLine2:
        typeof address.addressLine2 === "string" ? address.addressLine2 : null,
      area: typeof address.area === "string" ? address.area : null,
      division:
        typeof address.division === "string"
          ? address.division
          : typeof address.area === "string"
            ? address.area
            : null,
      upazila:
        typeof address.upazila === "string"
          ? address.upazila
          : typeof address.area === "string"
            ? address.area
            : null,
      district: text(address.district),
      postalCode:
        typeof address.postalCode === "string" ? address.postalCode : null,
      country:
        typeof address.country === "string" ? address.country : "Bangladesh",
    },
    subtotal: positiveInteger(row.subtotal),
    deliveryCharge: positiveInteger(row.deliveryCharge),
    discount: positiveInteger(row.discount),
    total: positiveInteger(row.total),
    paymentMethod: row.paymentMethod as PaymentMethod,
    paymentStatus: row.paymentStatus as PaymentStatus,
    status: row.status as OrderStatus,
    notes: typeof row.notes === "string" ? row.notes : null,
    createdAt: text(row.createdAt),
    items,
  };
}
