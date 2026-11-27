import { Container } from "@/components/layout/container";
import { ProductCardSkeleton } from "@/components/products/product-card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Streaming fallback for catalogue routes with runtime search parameters. */
export function CatalogFallback() {
  return (
    <Container className="py-12">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-10 w-72 max-w-full" />
      <Skeleton className="mt-4 h-4 w-full max-w-lg" />
      <Skeleton className="mt-10 h-10 w-full" />
      <div className="mt-8 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </Container>
  );
}
