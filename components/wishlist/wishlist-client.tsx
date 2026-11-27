"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  setWishlistProductAction,
  type WishlistActionResult,
} from "@/app/(storefront)/wishlist/actions";
import { AddToCartButton } from "@/components/products/add-to-cart-button";
import { ProductMedia } from "@/components/products/product-media";
import { usePreviewStore } from "@/components/providers/preview-store";
import { Button, buttonStyles } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { CartProduct } from "@/types/cart";
import { formatPrice } from "@/utils/format";

type ResolvedWishlist = WishlistActionResult<CartProduct[]>;

export function WishlistClient({
  getProductsAction,
}: {
  getProductsAction: (ids: readonly unknown[]) => Promise<
    WishlistActionResult<CartProduct[]>
  >;
}) {
  const {
    wishlist,
    ready,
    toggleWishlist,
    replaceWishlist,
    setAuthenticated,
    authenticated,
  } = usePreviewStore();
  const { toast } = useToast();
  const idsKey = [...wishlist].join(",");
  const [result, setResult] = useState<ResolvedWishlist>({
    ok: true,
    authenticated: false,
    data: [],
  });
  const [pending, setPending] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    // Server Actions update the router, so they must run from an async effect
    // callback rather than during render. State is always written from the
    // callback too, never synchronously in the effect body.
    void (async () => {
      if (!ready || idsKey.length === 0) {
        if (!active) return;
        setResult({ ok: true, authenticated: false, data: [] });
        setPending(false);
        return;
      }

      try {
        const next = await getProductsAction(idsKey.split(","));
        if (active) setResult(next);
      } catch {
        if (active) {
          setResult({
            ok: false,
            authenticated: false,
            error: "Please check your connection and try again.",
            data: [],
          });
        }
      } finally {
        if (active) setPending(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [ready, idsKey, getProductsAction]);

  async function removeProduct(product: CartProduct) {
    if (removingId) return;

    if (authenticated !== true) {
      toggleWishlist(product);
      return;
    }

    setRemovingId(product.id);
    try {
      const next = await setWishlistProductAction(product.id, false);
      if (next.ok && next.authenticated) {
        replaceWishlist(next.data);
        toast({
          title: "Removed from wishlist",
          description: product.name,
          variant: "info",
        });
        return;
      }

      if (next.ok && !next.authenticated) {
        setAuthenticated(false);
        toggleWishlist(product);
        return;
      }

      toast({
        title: "Wishlist not updated",
        description: next.error ?? "Please try again.",
        variant: "promo",
      });
    } catch {
      toast({
        title: "Wishlist not updated",
        description: "Please check your connection and try again.",
        variant: "promo",
      });
    } finally {
      setRemovingId(null);
    }
  }

  if (!ready || pending) {
    return <p className="py-20 text-center text-sm text-muted">Loading wishlist…</p>;
  }

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-line bg-white p-10 text-center">
        <p className="text-sm text-pink">
          {result.error ?? "We could not load your wishlist."}
        </p>
      </div>
    );
  }

  const products = result.data;

  if (products.length === 0) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-line bg-white p-10 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-pink-tint">
          <Heart className="size-6 text-pink" aria-hidden="true" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-medium text-charcoal">
          Nothing saved yet
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Tap the heart on any product to keep it here for later.
        </p>
        <Link href="/shop" className={buttonStyles({ className: "mt-6" })}>
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <article
          key={product.id}
          className="overflow-hidden rounded-2xl border border-line bg-white"
        >
          <Link href={`/product/${product.slug ?? product.id}`}>
            <ProductMedia
              imageUrl={product.imageUrl}
              alt={product.name}
              shape={product.visual}
              tone={product.tone}
              size="md"
              className="aspect-[4/3] w-full"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </Link>
          <div className="p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">
              {product.brandName ?? "Shundori"}
            </p>
            <h2 className="mt-1 font-display text-xl text-charcoal">
              <Link href={`/product/${product.slug ?? product.id}`}>
                {product.name}
              </Link>
            </h2>
            <p className="mt-2 text-sm text-charcoal">
              {formatPrice(product.price)}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <AddToCartButton product={product} className="flex-1" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={removingId === product.id}
                onClick={() => void removeProduct(product)}
              >
                {removingId === product.id ? "Removing…" : "Remove"}
              </Button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
