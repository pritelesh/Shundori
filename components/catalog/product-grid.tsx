import { ProductCard } from "@/components/products/product-card";
import { ProductCardSkeleton } from "@/components/products/product-card-skeleton";
import { toCardItem } from "@/lib/catalog-filter";
import type { CatalogProduct } from "@/types/product";
import { cn } from "@/utils/cn";

export interface ProductGridProps {
  products: readonly CatalogProduct[];
  className?: string;
  columns?: "two" | "three" | "four";
  /** Opt in only when this grid contains the page's above-the-fold LCP image. */
  priority?: boolean;
  /** Appends loading placeholders while more products are being revealed. */
  skeletonCount?: number;
}

export function ProductGrid({
  products,
  className,
  columns = "four",
  priority = false,
  skeletonCount = 0,
}: ProductGridProps) {
  const gridColumns = {
    two: "sm:grid-cols-2 lg:grid-cols-2",
    three: "sm:grid-cols-2 lg:grid-cols-3",
    four: "sm:grid-cols-2 lg:grid-cols-4",
  }[columns];

  return (
    <div className={cn("grid grid-cols-2 gap-4 sm:gap-5 lg:gap-6", gridColumns, className)}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={toCardItem(product)}
          href={`/product/${product.slug}`}
          priority={priority}
          lowStockThreshold={product.lowStockThreshold}
        />
      ))}
      {Array.from({ length: skeletonCount }, (_, index) => (
        <ProductCardSkeleton key={`loading-${index}`} />
      ))}
    </div>
  );
}
