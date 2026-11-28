import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { ProductCardItem } from "@/types/product";
import { cn } from "@/utils/cn";
import { discountPercent } from "@/utils/format";

import { AddToCartButton } from "./add-to-cart-button";
import { DiscountBadge } from "./discount-badge";
import { PriceDisplay } from "./price-display";
import { ProductMedia } from "./product-media";
import { ProductRating } from "./product-rating";
import { WishlistButton } from "./wishlist-button";

export interface ProductCardProps {
  product: ProductCardItem;
  href?: string;
  className?: string;
  priority?: boolean;
  /** Catalogue low-stock threshold; falls back to a presentation default. */
  lowStockThreshold?: number;
}

export function ProductCard({
  product,
  href,
  className,
  priority = false,
  lowStockThreshold = 6,
}: ProductCardProps) {
  const hasDiscount =
    discountPercent(product.price, product.compareAtPrice) !== null;
  // SALE is the only secondary badge with a data source today. NEW and FREE
  // SHIPPING stay hidden until a real product field or setting supplies them.
  const secondaryBadges = hasDiscount ? ["SALE"] : [];

  const lowStock =
    product.inStock &&
    typeof product.stockQuantity === "number" &&
    product.stockQuantity > 0 &&
    product.stockQuantity <= lowStockThreshold;

  const media = (
    <div className="product-card-media relative flex h-full w-full items-center justify-center p-3 transition-transform duration-500 ease-out sm:p-5">
      <ProductMedia
        imageUrl={product.imageUrl}
        alt={product.imageAlt ?? product.name}
        shape={product.visual}
        tone={product.tone}
        size="md"
        className="h-full w-full bg-transparent"
        visualClassName="text-[4.5rem] sm:text-[7rem]"
        showPlaceholderBadge
        priority={priority}
        sizes="(min-width: 1280px) 22vw, (min-width: 768px) 33vw, 50vw"
      />
    </div>
  );

  return (
    <article
      className={cn(
        "surface-card product-card-lift group flex flex-col overflow-hidden rounded-2xl transition-[transform,border-color,box-shadow] duration-300",
        className,
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-sage-light via-cream to-sage-light/50">
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

        <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex items-start justify-between gap-1.5 sm:inset-x-3 sm:top-3">
          <div className="pointer-events-auto flex flex-wrap gap-1.5">
            <DiscountBadge
              price={product.price}
              compareAtPrice={product.compareAtPrice}
            />
          </div>
          <WishlistButton
            productId={product.id}
            productName={product.name}
            className="pointer-events-auto"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        {product.brandName ? (
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-leaf">
            {product.brandName}
          </p>
        ) : null}

        <h3
          className={cn(
            "line-clamp-2 font-display text-base leading-snug text-forest sm:text-lg",
            product.brandName && "mt-1",
          )}
        >
          {href ? (
            <Link
              href={href}
              className="inline-block min-h-11 align-middle underline-offset-4 transition-colors hover:text-leaf hover:underline"
            >
              {product.name}
            </Link>
          ) : (
            product.name
          )}
        </h3>

        {secondaryBadges.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {secondaryBadges.map((label) => (
              <Badge key={label} variant="accentSoft">
                {label}
              </Badge>
            ))}
          </div>
        ) : null}

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
          size="lg"
          className="mt-3"
        />

        {lowStock ? (
          <p className="mt-2 text-xs font-medium text-forest">
            Only {product.stockQuantity} left
          </p>
        ) : null}

        <div className="mt-auto pt-4">
          <AddToCartButton
            product={product}
            inStockLabel="Add to Bag"
            outOfStockLabel="Out of Stock"
            className="w-full"
          />
          {!product.inStock && href ? (
            <Link
              href={href}
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center text-xs font-medium text-leaf underline-offset-4 hover:underline"
            >
              View details
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
