import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";

export interface ProductCardSkeletonProps {
  className?: string;
}

export function ProductCardSkeleton({ className }: ProductCardSkeletonProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-warm-line/70 bg-warm-white",
        className,
      )}
    >
      <Skeleton className="aspect-[4/5] rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-9 w-full rounded-full" />
      </div>
    </div>
  );
}
