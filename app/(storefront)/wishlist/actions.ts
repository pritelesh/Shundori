"use server";

import { revalidatePath } from "next/cache";

import { errorMessage } from "@/lib/admin-validation";
import { effectivePrice } from "@/lib/offer-pricing";
import { getProductsByIds } from "@/services/catalog";
import {
  setAuthenticatedWishlistProduct,
  syncAuthenticatedWishlist,
} from "@/services/wishlist";
import type { CartProduct } from "@/types/cart";

export interface WishlistActionResult<T> {
  ok: boolean;
  authenticated: boolean;
  data: T;
  error?: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failure<T>(error: unknown, data: T): WishlistActionResult<T> {
  console.error("Wishlist action failed", error);
  return {
    ok: false,
    authenticated: false,
    data,
    error: errorMessage(error),
  };
}

export async function syncWishlistAction(
  ids: readonly unknown[],
): Promise<WishlistActionResult<string[]>> {
  try {
    const synced = await syncAuthenticatedWishlist(ids);
    if (synced === null) {
      return { ok: true, authenticated: false, data: [] };
    }
    revalidatePath("/wishlist");
    return { ok: true, authenticated: true, data: synced };
  } catch (error) {
    return failure(error, []);
  }
}

export async function setWishlistProductAction(
  productId: string,
  add: boolean,
): Promise<WishlistActionResult<string[]>> {
  try {
    const ids = await setAuthenticatedWishlistProduct(productId, add);
    if (ids === null) {
      return { ok: true, authenticated: false, data: [] };
    }
    revalidatePath("/wishlist");
    return { ok: true, authenticated: true, data: ids };
  } catch (error) {
    return failure(error, []);
  }
}

/** Guest wishlist view: only active product rows are returned. */
export async function getWishlistProductsAction(
  ids: readonly unknown[],
): Promise<WishlistActionResult<CartProduct[]>> {
  try {
    const clean = [...new Set(ids)]
      .filter((id): id is string => typeof id === "string" && UUID_PATTERN.test(id))
      .slice(0, 100);

    const products = await getProductsByIds(clean);
    return {
      ok: true,
      authenticated: false,
      data: products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        brandName: product.brand,
        price: effectivePrice(product),
        imageUrl: product.images[0]?.url ?? null,
        visual: product.visual,
        tone: product.tone,
        stockQuantity: product.stockQuantity,
      })),
    };
  } catch (error) {
    return failure(error, []);
  }
}
