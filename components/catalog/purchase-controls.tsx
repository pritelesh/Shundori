"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

import { AddToCartButton } from "@/components/products/add-to-cart-button";
import { WishlistButton } from "@/components/products/wishlist-button";
import type { CartProduct } from "@/types/cart";

export function PurchaseControls({ product }: { product: CartProduct }) {
  const [quantity, setQuantity] = useState(1);
  const limit = product.stockQuantity ?? 99;
  const soldOut = limit <= 0;

  return (
    <div className="mt-8 space-y-4">
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.16em] text-taupe">
          Quantity
        </p>
        <div className="inline-flex items-center rounded-full border border-warm-line bg-warm-white">
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            disabled={quantity <= 1 || soldOut}
            aria-label="Decrease quantity"
            className="inline-flex size-11 items-center justify-center rounded-full text-dark-text transition-colors hover:bg-warm-white disabled:opacity-40"
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
            className="inline-flex size-11 items-center justify-center rounded-full text-dark-text transition-colors hover:bg-warm-white disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>
        {limit > 0 && limit <= 6 ? (
          <p className="mt-2 text-xs text-taupe">Only {limit} left in this demo listing.</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <AddToCartButton
          product={product}
          quantity={quantity}
          size="lg"
          className="min-w-[13rem] flex-1 sm:flex-none"
        />
        <WishlistButton
          productId={product.id}
          productName={product.name}
          className="size-12 border border-warm-line bg-warm-white"
        />
      </div>
    </div>
  );
}
