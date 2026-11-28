"use client";

import { Heart } from "lucide-react";
import { useState } from "react";

import { setWishlistProductAction } from "@/app/(storefront)/wishlist/actions";
import { usePreviewStore } from "@/components/providers/preview-store";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/utils/cn";

export interface WishlistButtonProps {
  productId: string;
  productName: string;
  className?: string;
}

export function WishlistButton({
  productId,
  productName,
  className,
}: WishlistButtonProps) {
  const { toast } = useToast();
  const {
    isWishlisted,
    toggleWishlist,
    replaceWishlist,
    setAuthenticated,
    authenticated,
  } = usePreviewStore();
  const [pending, setPending] = useState(false);
  const active = isWishlisted(productId);

  async function onClick() {
    if (pending) return;

    if (authenticated !== true) {
      toggleWishlist({ id: productId, name: productName });
      return;
    }

    const shouldAdd = !active;
    setPending(true);
    try {
      const result = await setWishlistProductAction(productId, shouldAdd);
      if (result.ok && result.authenticated) {
        replaceWishlist(result.data);
        toast({
          title: shouldAdd ? "Saved to wishlist" : "Removed from wishlist",
          description: productName,
          variant: shouldAdd ? "success" : "info",
        });
        return;
      }

      if (result.ok && !result.authenticated) {
        setAuthenticated(false);
        toggleWishlist({ id: productId, name: productName });
        return;
      }

      toast({
        title: "Wishlist not updated",
        description: result.error ?? "Please try again.",
        variant: "promo",
      });
    } catch {
      toast({
        title: "Wishlist not updated",
        description: "Please check your connection and try again.",
        variant: "promo",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-disabled={pending}
      aria-label={
        active
          ? `Remove ${productName} from wishlist`
          : `Save ${productName} to wishlist`
      }
      onClick={onClick}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-cream/95 text-ink-soft shadow-soft ring-1 ring-sage-light/70 transition-all hover:bg-cream hover:text-forest",
        pending && "opacity-60",
        className,
      )}
    >
      <Heart
        className={cn(
          "size-4 transition-colors",
          active ? "fill-forest text-forest" : "fill-transparent",
        )}
        aria-hidden="true"
      />
    </button>
  );
}
