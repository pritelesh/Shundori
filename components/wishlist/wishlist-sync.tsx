import { connection } from "next/server";

import { getAuthenticatedWishlistIds } from "@/services/wishlist";

import { WishlistSyncClient } from "./wishlist-sync-client";

/** Request-authenticated component; rendered inside a Suspense boundary. */
export async function WishlistSync() {
  // Supabase validates session expiry with Date.now(). Cache Components must
  // defer that work to request time; this component already sits in Suspense.
  await connection();
  const ids = await getAuthenticatedWishlistIds();
  return <WishlistSyncClient initialIds={ids} />;
}
