"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import { AddToCartButton } from "@/components/products/add-to-cart-button";
import { PriceDisplay } from "@/components/products/price-display";
import { WishlistButton } from "@/components/products/wishlist-button";
import type { CartProduct } from "@/types/cart";
import type { Poisha } from "@/types/product";
import { cn } from "@/utils/cn";

export interface PurchaseControlsProps {
  product: CartProduct;
  /** Enables the mobile sticky bar that sits directly above the bottom nav. */
  price?: Poisha;
  compareAtPrice?: Poisha | null;
}

export function PurchaseControls({
  product,
  price,
  compareAtPrice,
}: PurchaseControlsProps) {
  const [quantity, setQuantity] = useState(1);
  const limit = product.stockQuantity ?? 99;
  const soldOut = limit <= 0;
  const hasStickyBar = typeof price === "number";

  return (
    <>
      <div className="mt-8 space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-ink-soft">
            Quantity
          </p>
          <div className="inline-flex items-center rounded-full border border-sage-light bg-cream">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              disabled={quantity <= 1 || soldOut}
              aria-label="Decrease quantity"
              className="inline-flex size-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream disabled:opacity-40"
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <span
              aria-live="polite"
              className="w-10 text-center text-sm font-medium tabular-nums"
            >
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(limit, value + 1))}
              disabled={quantity >= limit || soldOut}
              aria-label="Increase quantity"
              className="inline-flex size-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream disabled:opacity-40"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>
          {limit > 0 && limit <= 6 ? (
            <p className="mt-2 text-xs text-ink-soft">
              Only {limit} left in this demo listing.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AddToCartButton
            product={product}
            quantity={quantity}
            size="lg"
            inStockLabel="Add to Bag"
            outOfStockLabel="Out of Stock"
            className={cn(
              "min-w-[13rem] flex-1 sm:flex-none",
              hasStickyBar && "hidden md:inline-flex",
            )}
          />
          <WishlistButton
            productId={product.id}
            productName={product.name}
            className="size-12 border border-sage-light bg-cream"
          />
        </div>
      </div>

      {hasStickyBar ? (
        <div
          className={cn(
            "fixed inset-x-0 z-40 border-t border-sage-light bg-cream/95 px-4 py-3 shadow-sticky backdrop-blur md:hidden",
            // 3.5rem is the bottom nav height; the safe area sits below it.
            "bottom-[calc(env(safe-area-inset-bottom)+3.5rem)]",
          )}
        >
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <PriceDisplay
                price={price}
                compareAtPrice={compareAtPrice}
                size="sm"
                className="flex-col items-start gap-0.5"
              />
              <p className="mt-0.5 text-xs text-ink-soft">Qty {quantity}</p>
            </div>
            <AddToCartButton
              product={product}
              quantity={quantity}
              size="md"
              inStockLabel="Add to Bag"
              outOfStockLabel="Out of Stock"
              className="shrink-0 px-5"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
