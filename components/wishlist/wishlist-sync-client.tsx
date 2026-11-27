"use client";

import { useEffect, useRef } from "react";

import { syncWishlistAction } from "@/app/(storefront)/wishlist/actions";
import { usePreviewStore } from "@/components/providers/preview-store";

/**
 * Reconciles the guest localStorage wishlist with an authenticated account.
 * Guests are left untouched; signed-in customers get one authoritative merge.
 */
export function WishlistSyncClient({
  initialIds,
}: {
  initialIds: string[] | null;
}) {
  const { ready, wishlist, replaceWishlist, setAuthenticated } =
    usePreviewStore();
  const started = useRef(false);

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;

    if (initialIds === null) {
      setAuthenticated(false);
      return;
    }

    setAuthenticated(true);
    const guestIds = [...wishlist].filter((id) => !initialIds.includes(id));
    if (guestIds.length === 0) {
      replaceWishlist(initialIds);
      return;
    }

    syncWishlistAction(guestIds)
      .then((result) => {
        if (result.ok && result.authenticated) {
          replaceWishlist(result.data);
        } else {
          replaceWishlist(initialIds);
        }
      })
      .catch(() => {
        replaceWishlist(initialIds);
      });
  }, [ready, wishlist, initialIds, replaceWishlist, setAuthenticated]);

  return null;
}
