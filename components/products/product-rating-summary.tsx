import Link from "next/link";

import { ProductRating } from "@/components/products/product-rating";

export interface ProductRatingSummaryProps {
  rating: number;
  reviewCount: number;
  href?: string;
}

/** Rating row with a direct link down to the published review list. */
export function ProductRatingSummary({
  rating,
  reviewCount,
  href = "#reviews",
}: ProductRatingSummaryProps) {
  return (
    <Link
      href={href}
      className="mt-3 inline-flex min-h-11 max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-sm underline-offset-4 hover:underline"
    >
      <ProductRating rating={rating} reviewCount={reviewCount} />
      <span className="text-xs font-medium text-leaf">
        {reviewCount > 0 ? "Read reviews" : "See reviews"}
      </span>
    </Link>
  );
}
