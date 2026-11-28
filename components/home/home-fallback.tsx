import { Container } from "@/components/layout/container";
import { ProductCardSkeleton } from "@/components/products/product-card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** Lightweight streaming placeholder for the request-time homepage data. */
export function HomeFallback() {
  return (
    <div aria-hidden="true">
      <Container className="p-2 sm:p-3 lg:p-4">
        <div className="mx-auto grid max-w-7xl items-center gap-8 rounded-3xl bg-sage-light/40 px-6 py-10 lg:min-h-[560px] lg:grid-cols-[1.05fr_0.95fr] lg:px-14">
          <div>
            <Skeleton className="h-4 w-40 rounded-full" />
            <Skeleton className="mt-5 h-12 w-full max-w-md" />
            <Skeleton className="mt-2 h-10 w-2/3 max-w-xs" />
            <Skeleton className="mt-5 h-4 w-64 max-w-full" />
            <Skeleton className="mt-7 h-11 w-36 rounded-full" />
          </div>
          <Skeleton className="mx-auto aspect-[4/5] w-[72%] max-w-[22rem] rounded-[2rem]" />
        </div>
      </Container>
      <div className="border-t border-sage-light/70 bg-mist py-2.5">
        <Container className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-full" />
          ))}
        </Container>
      </div>
      <Container className="py-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-7 w-48 max-w-full" />
          <span className="h-px flex-1 bg-sage-light/80" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="mt-5 flex gap-4 overflow-hidden lg:grid lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton
              key={index}
              className="aspect-[3/4] w-[72%] max-w-[16rem] shrink-0 rounded-2xl lg:w-auto lg:max-w-none"
            />
          ))}
        </div>
      </Container>
      <Container className="py-12">
        <Skeleton className="h-9 w-56 max-w-full" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </Container>
    </div>
  );
}
