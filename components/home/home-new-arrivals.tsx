import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { ProductGrid } from "@/components/catalog/product-grid";
import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/ui/section-heading";
import type { CatalogProduct } from "@/types/product";

export interface HomeNewArrivalsProps {
  products: readonly CatalogProduct[];
  demo: boolean;
}

export function HomeNewArrivals({ products, demo }: HomeNewArrivalsProps) {
  const arrivals = products.slice(0, 4);

  if (arrivals.length === 0) return null;

  return (
    <section
      id="new-arrivals"
      className="scroll-mt-24 py-12 sm:py-16"
      aria-labelledby="new-arrivals-title"
    >
      <Container>
        <SectionHeading
          id="new-arrivals-title"
          eyebrow="New arrivals"
          title="Just listed."
          description={
            demo
              ? `${arrivals.length} newest demonstration listings.`
              : `${arrivals.length} newest catalogue listings.`
          }
          action={
            <Link
              href="/shop?sort=newest"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-leaf underline-offset-4 hover:underline"
            >
              See all new arrivals
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          }
        />

        <div className="mt-7">
          <ProductGrid products={arrivals} columns="four" />
        </div>
      </Container>
    </section>
  );
}
