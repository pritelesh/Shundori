import "server-only";

import { ValidationError } from "@/lib/admin-validation";
import { hasSupabasePublicEnv } from "@/lib/env/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getProductsByIds } from "@/services/catalog";

const MAX_WISHLIST_IDS = 100;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanIds(ids: readonly unknown[]): string[] {
  const result: string[] = [];
  for (const id of ids) {
    if (
      typeof id === "string" &&
      UUID_PATTERN.test(id) &&
      !result.includes(id)
    ) {
      result.push(id);
    }
    if (result.length === MAX_WISHLIST_IDS) break;
  }
  return result;
}

async function currentUser(): Promise<string | null> {
  // Demo mode has no Auth project; wishlists stay in localStorage.
  if (!hasSupabasePublicEnv()) return null;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Returns null for guests so callers can keep localStorage as the source. */
export async function getAuthenticatedWishlistIds(): Promise<string[] | null> {
  const userId = await currentUser();
  if (!userId) return null;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("wishlists")
    .select("product_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as { product_id: string }[]).map((row) => row.product_id);
}

export async function getAuthenticatedWishlistProducts() {
  const ids = await getAuthenticatedWishlistIds();
  if (!ids) return [];
  return getProductsByIds(ids);
}

/**
 * Merges a guest's localStorage wishlist into the signed-in account. Existing
 * account entries are preserved, and only active products are added.
 */
export async function syncAuthenticatedWishlist(
  ids: readonly unknown[],
): Promise<string[] | null> {
  const userId = await currentUser();
  if (!userId) return null;

  const candidateIds = cleanIds(ids);
  const supabase = await createServerSupabaseClient();

  if (candidateIds.length > 0) {
    const { data: active, error: activeError } = await supabase
      .from("products")
      .select("id")
      .in("id", candidateIds)
      .eq("is_active", true);
    if (activeError) throw activeError;

    const activeIds = (active as { id: string }[]).map((row) => row.id);
    if (activeIds.length > 0) {
      const { error } = await supabase.from("wishlists").upsert(
        activeIds.map((productId) => ({ user_id: userId, product_id: productId })),
        { onConflict: "user_id,product_id", ignoreDuplicates: true },
      );
      if (error) throw error;
    }
  }

  return (await getAuthenticatedWishlistIds()) ?? [];
}

export async function setAuthenticatedWishlistProduct(
  productId: string,
  add: boolean,
): Promise<string[] | null> {
  if (!UUID_PATTERN.test(productId)) {
    throw new ValidationError({ wishlist: "A valid product is required." });
  }

  const userId = await currentUser();
  if (!userId) return null;

  const supabase = await createServerSupabaseClient();
  if (add) {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .eq("is_active", true)
      .maybeSingle<{ id: string }>();
    if (productError) throw productError;
    if (!product) {
      throw new ValidationError({ wishlist: "That product is no longer available." });
    }

    const { error } = await supabase.from("wishlists").upsert(
      { user_id: userId, product_id: productId },
      { onConflict: "user_id,product_id", ignoreDuplicates: true },
    );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("wishlists")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", productId);
    if (error) throw error;
  }

  return (await getAuthenticatedWishlistIds()) ?? [];
}
