import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { ProductMedia } from "@/components/products/product-media";
import type { CatalogCategory } from "@/types/product";

export interface HomeCategoriesProps {
  categories: readonly CatalogCategory[];
  counts: readonly number[];
}

/** Photo cards: snap-scrolling on mobile, six columns on desktop. */
export function HomeCategories({ categories }: HomeCategoriesProps) {
  return (
    <section
      id="categories"
      className="scroll-mt-24 py-8 sm:py-10"
      aria-labelledby="categories-title"
    >
      <Container>
        <div className="flex items-center gap-4">
          <h2
            id="categories-title"
            className="shrink-0 font-display text-xl text-forest sm:text-2xl"
          >
            Shop By Category
          </h2>
          <span
            aria-hidden="true"
            className="h-px min-w-6 flex-1 bg-sage-light/80"
          />
          <Link
            href="/shop"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-leaf underline-offset-4 transition-colors hover:text-forest hover:underline"
          >
            View all
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>

        {categories.length > 0 ? (
          <ul className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-6 lg:gap-4 lg:overflow-visible lg:pb-0">
            {categories.map((category) => (
              <li
                key={category.slug}
                className="w-[72%] max-w-[16rem] shrink-0 snap-start lg:w-auto lg:max-w-none"
              >
                <Link
                  href={`/category/${category.slug}`}
                  className="product-card-lift group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-2xl border border-sage-light/70 bg-sage-light/60 p-3 transition-all duration-200"
                >
                  {category.imageUrl ? (
                    <ProductMedia
                      imageUrl={category.imageUrl}
                      alt=""
                      shape={category.visual}
                      tone={category.tone}
                      size="md"
                      className="product-card-media absolute inset-0 bg-transparent transition-transform duration-300"
                      imageClassName="object-cover"
                      sizes="(max-width: 1024px) 72vw, 16vw"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[linear-gradient(160deg,var(--color-sage),var(--color-sage-light))]">
                      <ProductMedia
                        imageUrl={null}
                        alt=""
                        shape={category.visual}
                        tone={category.tone}
                        size="md"
                        className="product-card-media absolute inset-0 bg-transparent transition-transform duration-300"
                        visualClassName="text-[5rem]"
                        sizes="(max-width: 1024px) 72vw, 16vw"
                      />
                    </div>
                  )}

                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-forest/90 via-forest/35 to-transparent"
                  />

                  <div className="relative z-10">
                    <p className="line-clamp-2 font-display text-base leading-tight text-cream">
                      {category.name}
                    </p>
                    <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-cream/90">
                      Shop Now
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </Container>
    </section>
  );
}
