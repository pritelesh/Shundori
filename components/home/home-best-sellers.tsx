import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { DemoNotice } from "@/components/catalog/demo-notice";
import { ProductGrid } from "@/components/catalog/product-grid";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/ui/section-heading";
import type { CatalogProduct } from "@/types/product";

export interface HomeBestSellersProps {
  products: readonly CatalogProduct[];
  demo: boolean;
}

export function HomeBestSellers({ products, demo }: HomeBestSellersProps) {
  const featured = products.slice(0, 8);

  if (featured.length === 0) return null;

  return (
    <section
      id="bestsellers"
      className="scroll-mt-24 py-12 sm:py-16"
      aria-labelledby="bestsellers-title"
    >
      <Container>
        <SectionHeading
          id="bestsellers-title"
          eyebrow="Best sellers"
          title="Popular picks."
          description={`${featured.length} featured products from the catalogue.`}
          action={
            <Link
              href="/shop"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-leaf underline-offset-4 hover:underline"
            >
              Shop all products
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          }
        />

        <DemoNotice demo={demo} className="mt-7 max-w-3xl" />

        <div className="mt-7">
          <ProductGrid products={featured} />
        </div>
      </Container>
    </section>
  );
}
