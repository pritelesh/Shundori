import { Container } from "@/components/layout/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function StorefrontLoading() {
  return (
    <Container className="py-16">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-5 h-10 w-80 max-w-full" />
      <Skeleton className="mt-4 h-5 w-full max-w-xl" />
      <div className="mt-12 grid grid-cols-2 gap-5 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="space-y-3">
            <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </Container>
  );
}
