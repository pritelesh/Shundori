import { BadgeCheck, Star } from "lucide-react";

import type { ProductReview } from "@/types/phase8";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/format";

export function ProductReviewList({ reviews }: { reviews: ProductReview[] }) {
  if (reviews.length === 0) {
    return (
      <p className="rounded-xl border border-sage-light bg-mist/40 p-5 text-sm text-ink-soft">
        No published reviews yet. Verified customers can be the first to share feedback.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {reviews.map((review) => (
        <li key={review.id} className="surface-card rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1" aria-label={`${review.rating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Star
                  key={value}
                  className={cn(
                    "size-4",
                    value <= review.rating ? "fill-forest text-forest" : "text-forest/60",
                  )}
                  aria-hidden="true"
                />
              ))}
              <span className="ml-2 text-xs text-ink-soft">{formatDate(review.createdAt)}</span>
            </div>
            {review.verifiedPurchase ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-sage-light px-2.5 py-1 text-xs font-medium text-forest">
                <BadgeCheck className="size-3.5" aria-hidden="true" />
                Verified purchase
              </span>
            ) : null}
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-soft">
            {review.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
