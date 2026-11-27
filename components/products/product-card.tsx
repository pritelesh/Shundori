import Image from "next/image";
import Link from "next/link";

import type { ProductCardItem } from "@/types/product";
import { cn } from "@/utils/cn";

import { AddToCartButton } from "./add-to-cart-button";
import { DiscountBadge } from "./discount-badge";
import { PriceDisplay } from "./price-display";
import { ProductRating } from "./product-rating";
import { ProductVisual } from "./product-visual";
import { WishlistButton } from "./wishlist-button";

export interface ProductCardProps {
  product: ProductCardItem;
  /** Added once product detail routes exist in Phase 3. */
  href?: string;
  className?: string;
  priority?: boolean;
}

export function ProductCard({
  product,
  href,
  className,
  priority = false,
}: ProductCardProps) {
  const lowStock =
    typeof product.stockQuantity === "number" &&
    product.stockQuantity > 0 &&
    product.stockQuantity <= 6;

  const stockLabel = !product.inStock
    ? "Out of stock"
    : lowStock
      ? `Only ${product.stockQuantity} left`
      : "In stock";

  const stockDot = !product.inStock
    ? "bg-dark-text/35"
    : lowStock
      ? "bg-chocolate"
      : "bg-olive";

  const media = (
    <div className="relative flex h-full w-full items-center justify-center p-4 transition-transform duration-500 ease-out group-hover:scale-[1.04] sm:p-6">
      {product.imageUrl ? (
        <Image
          src={product.imageUrl}
          alt={product.imageAlt ?? product.name}
          fill
          priority={priority}
          sizes="(min-width: 1280px) 22vw, (min-width: 768px) 33vw, 50vw"
          className="object-cover"
        />
      ) : (
        <ProductVisual
          shape={product.visual}
          tone={product.tone}
          size="md"
          className="text-[5.25rem] sm:text-[7.5rem]"
        />
      )}
    </div>
  );

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-warm-line/70 bg-warm-white transition-all duration-300 hover:-translate-y-1 hover:border-warm-line-strong hover:shadow-soft",
        className,
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-soft-cream via-warm-white to-light-beige/50">
        {href ? (
          <Link
            href={href}
            className="block h-full w-full"
            tabIndex={-1}
            aria-hidden="true"
          >
            {media}
          </Link>
        ) : (
          media
        )}

        <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
          <div className="pointer-events-auto flex flex-wrap gap-2">
            {product.inStock ? (
              <DiscountBadge
                price={product.price}
                compareAtPrice={product.compareAtPrice}
              />
            ) : (
              <span className="rounded-full bg-warm-white/95 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-dark-text shadow-sm ring-1 ring-warm-line/70">
                Sold out
              </span>
            )}
          </div>
          <WishlistButton
            productId={product.id}
            productName={product.name}
            className="pointer-events-auto"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-olive-deep">
          {product.brandName ?? "Shundori"}
        </p>

        <h3 className="mt-1.5 font-display text-lg leading-snug text-dark-text">
          {href ? (
            <Link
              href={href}
              className="underline-offset-4 transition-colors hover:text-olive-deep hover:underline"
            >
              {product.name}
            </Link>
          ) : (
            product.name
          )}
        </h3>

        {typeof product.rating === "number" ? (
          <ProductRating
            rating={product.rating}
            reviewCount={product.reviewCount}
            className="mt-2"
          />
        ) : null}

        <PriceDisplay
          price={product.price}
          compareAtPrice={product.compareAtPrice}
          className="mt-3"
        />

        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-taupe">
          <span
            aria-hidden="true"
            className={cn("size-1.5 rounded-full", stockDot)}
          />
          {stockLabel}
        </p>

        <div className="mt-auto pt-4">
          <AddToCartButton product={product} className="w-full" />
        </div>
      </div>
    </article>
  );
}
