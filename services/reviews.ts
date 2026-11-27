import "server-only";

import { assertUuid, ValidationError } from "@/lib/admin-validation";
import { hasSupabasePublicEnv } from "@/lib/env/public";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/services/authorization";
import type {
  EligibleReviewItem,
  PendingReview,
  ProductReview,
} from "@/types/phase8";

interface ReviewRow {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string;
  order_item_id: string;
  rating: number;
  body: string;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

interface EligibleItemRow {
  id: string;
  order_id: string;
  product_name: string;
  orders:
    | {
        id: string;
        order_number: string;
        customer_id: string | null;
        order_status: string;
        cancellation_status: string | null;
        created_at: string;
      }
    | Array<{
        id: string;
        order_number: string;
        customer_id: string | null;
        order_status: string;
        cancellation_status: string | null;
        created_at: string;
      }>
    | null;
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapReview(row: ReviewRow): ProductReview {
  return {
    id: row.id,
    productId: row.product_id,
    userId: row.user_id,
    rating: row.rating,
    body: row.body,
    isApproved: row.is_approved,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    verifiedPurchase: true,
  };
}

export async function getApprovedReviews(
  productId: string,
): Promise<ProductReview[]> {
  assertUuid(productId, "productId");
  if (!hasSupabasePublicEnv()) return [];

  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("product_reviews")
    .select("*")
    .eq("product_id", productId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data as ReviewRow[]).map(mapReview);
}

/** DB-derived eligibility; a browser flag can never make a review verified. */
export async function canCurrentUserReviewProduct(
  productId: string,
): Promise<boolean> {
  assertUuid(productId, "productId");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase.rpc("can_review_product", {
    p_product_id: productId,
  });
  if (error) throw error;
  return data === true;
}

export async function getEligibleReviewItems(
  productId: string,
): Promise<EligibleReviewItem[]> {
  assertUuid(productId, "productId");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const [itemsResult, reviewsResult] = await Promise.all([
    supabase
      .from("order_items")
      .select(
        "id, order_id, product_name, orders!inner(id, order_number, customer_id, order_status, cancellation_status, created_at)",
      )
      .eq("product_id", productId)
      .eq("orders.customer_id", user.id)
      .eq("orders.order_status", "delivered"),
    supabase
      .from("product_reviews")
      .select("order_item_id")
      .eq("product_id", productId)
      .eq("user_id", user.id),
  ]);

  if (itemsResult.error) throw itemsResult.error;
  if (reviewsResult.error) throw reviewsResult.error;

  const reviewed = new Set(
    (reviewsResult.data ?? []).map(
      (row: { order_item_id: string }) => row.order_item_id,
    ),
  );

  return (itemsResult.data ?? [])
    .map((row: EligibleItemRow) => {
      const order = first(row.orders);
      if (
        !order ||
        order.customer_id !== user.id ||
        order.order_status !== "delivered" ||
        ["requested", "approved"].includes(order.cancellation_status ?? "none") ||
        reviewed.has(row.id)
      ) {
        return null;
      }

      return {
        orderItemId: row.id,
        orderId: order.id,
        orderNumber: order.order_number,
        productName: row.product_name,
        purchasedAt: order.created_at,
      } satisfies EligibleReviewItem;
    })
    .filter((item): item is EligibleReviewItem => item !== null)
    .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
}

export interface SubmitReviewInput {
  productId: string;
  orderId: string;
  orderItemId: string;
  rating: number;
  body: string;
}

export async function submitProductReview(input: SubmitReviewInput): Promise<void> {
  assertUuid(input.productId, "productId");
  assertUuid(input.orderId, "orderId");
  assertUuid(input.orderItemId, "orderItemId");

  const errors: Record<string, string> = {};
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    errors.rating = "Choose a rating from 1 to 5 stars.";
  }
  const body = input.body.trim();
  if (body.length < 10 || body.length > 2000) {
    errors.body = "Write between 10 and 2000 characters.";
  }
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new ValidationError({ auth: "Sign in to review a purchased product." });
  }

  const { error } = await supabase.from("product_reviews").insert({
    product_id: input.productId,
    user_id: user.id,
    order_id: input.orderId,
    order_item_id: input.orderItemId,
    rating: input.rating,
    body,
    is_approved: false,
  });

  if (error) {
    console.error("Review submission failed", error);
    throw new ValidationError({
      body: "We could not submit this review. Only delivered purchases can be reviewed once.",
    });
  }
}

export async function listAdminReviews(): Promise<PendingReview[]> {
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("product_reviews")
    .select("*, products(name), orders(order_number)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const rows = data as (ReviewRow & {
    products?: { name: string } | { name: string }[] | null;
    orders?: { order_number: string } | { order_number: string }[] | null;
  })[];
  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const names = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    if (profileError) throw profileError;
    for (const profile of profiles ?? []) {
      if (profile.full_name) names.set(profile.id, profile.full_name);
    }
  }

  return rows.map((row) => ({
    ...mapReview(row),
    productName: first(row.products)?.name ?? "Deleted product",
    orderNumber: first(row.orders)?.order_number ?? null,
    customerName: names.get(row.user_id) ?? "Customer",
  }));
}

export async function moderateReview(id: string, approve: boolean): Promise<void> {
  assertUuid(id, "reviewId");
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("product_reviews")
    .update({ is_approved: approve, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
