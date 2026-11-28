import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { ProductMedia } from "@/components/products/product-media";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { PriceDisplay } from "@/components/products/price-display";
import {
  effectiveCompareAtPrice,
  effectivePrice,
  offerDiscountPercentage,
} from "@/lib/offer-pricing";
import type { CatalogProduct } from "@/types/product";

export interface HomeOffersProps {
  products: readonly CatalogProduct[];
}

/** Deals strip built only from products with a currently active sale price. */
export function HomeOffers({ products }: HomeOffersProps) {
  const deals = products
    .map((product) => ({
      product,
      percent: offerDiscountPercentage(product),
      price: effectivePrice(product),
      compareAtPrice: effectiveCompareAtPrice(product),
    }))
    .filter((item) => item.percent > 0 && item.compareAtPrice !== null)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 4);

  if (deals.length === 0) return null;

  const maxPercent = deals[0]?.percent ?? 0;

  return (
    <section
      id="offers"
      className="scroll-mt-24 border-y border-sage-light bg-sage-light/40 py-12 sm:py-16"
      aria-labelledby="offers-title"
    >
      <Container>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-forest">
              Offers
            </p>
            <h2
              id="offers-title"
              className="mt-2 font-display text-3xl leading-tight text-forest sm:text-4xl"
            >
              Up to {maxPercent}% off.
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              {deals.length} products with an active sale price.
            </p>
          </div>
          <Link
            href="/shop?sort=price-desc"
            className={buttonStyles({ variant: "outline", size: "md" })}
          >
            All products
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <ul className="mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3">
          {deals.map(({ product, percent, price, compareAtPrice }) => {
            const image = product.images[0];
            return (
              <li
                key={product.id}
                className="w-[76vw] max-w-[19rem] shrink-0 snap-start sm:w-64"
              >
                <Link
                  href={`/product/${product.slug}`}
                  className="surface-card group block overflow-hidden rounded-2xl transition-colors hover:border-sage"
                >
                  <div className="relative aspect-[5/4] bg-gradient-to-br from-sage-light to-sage-light/70">
                    <ProductMedia
                      imageUrl={image?.url ?? null}
                      alt={image?.alt ?? product.name}
                      shape={image?.visual ?? product.visual}
                      tone={image?.tone ?? product.tone}
                      size="sm"
                      className="absolute inset-0 bg-transparent"
                      visualClassName="text-[5rem]"
                      sizes="(max-width: 640px) 76vw, 256px"
                    />
                    <Badge
                      variant="brand"
                      className="absolute left-3 top-3 shadow-soft"
                    >
                      {percent}% OFF
                    </Badge>
                  </div>
                  <div className="p-3">
                    <p className="text-xs uppercase tracking-[0.08em] text-leaf">
                      {product.brand}
                    </p>
                    <h3 className="mt-1 line-clamp-2 font-display text-base leading-snug text-forest">
                      {product.name}
                    </h3>
                    <PriceDisplay
                      price={price}
                      compareAtPrice={compareAtPrice}
                      size="sm"
                      className="mt-2"
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
