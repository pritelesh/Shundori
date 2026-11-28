import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/ui/section-heading";
import type { CatalogBrand } from "@/types/product";

export interface HomeBrandsProps {
  brands: readonly CatalogBrand[];
  counts: readonly number[];
  demo: boolean;
}

/** Logo/name strip with horizontal scrolling on small screens. */
export function HomeBrands({ brands, counts, demo }: HomeBrandsProps) {
  const total = counts.reduce((sum, count) => sum + count, 0);

  return (
    <section
      id="brands"
      className="scroll-mt-24 border-y border-sage-light bg-cream/70 py-12 sm:py-16"
      aria-labelledby="brands-title"
    >
      <Container>
        <SectionHeading
          id="brands-title"
          eyebrow="Brands"
          title="Shop by brand."
          description={
            demo
              ? `${brands.length} brands · names shown as text in this preview.`
              : `${brands.length} brands · ${total} listed products. Logo shown when supplied.`
          }
        />

        {brands.length > 0 ? (
          <ul className="mt-7 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3">
            {brands.map((brand, index) => (
              <li key={brand.slug} className="shrink-0 snap-start">
                <Link
                  href={`/brand/${brand.slug}`}
                  className="surface-card group flex w-[9.5rem] flex-col items-center gap-2 rounded-2xl p-4 text-center transition-colors hover:border-sage"
                >
                  <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-sage-light bg-cream font-display text-xl text-leaf">
                    {brand.logoUrl ? (
                      <Image
                        src={brand.logoUrl}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-contain p-2"
                      />
                    ) : (
                      brand.monogram
                    )}
                  </span>
                  <span className="line-clamp-1 font-display text-base leading-tight text-forest">
                    {brand.name}
                  </span>
                  <span className="text-xs text-ink-soft">
                    {counts[index] ?? 0} products
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </Container>
    </section>
  );
}
