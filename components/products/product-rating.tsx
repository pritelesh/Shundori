import { Star } from "lucide-react";

import { cn } from "@/utils/cn";

export interface ProductRatingProps {
  rating: number;
  reviewCount?: number;
  className?: string;
}

/**
 * Compact rating row. The stars are decorative; the numeric value and review
 * count carry the accessible information.
 */
export function ProductRating({
  rating,
  reviewCount,
  className,
}: ProductRatingProps) {
  const rounded = Math.round(rating);

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span aria-hidden="true" className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, index) => (
          <Star
            key={index}
            className={cn(
              "size-3.5",
              index < rounded
                ? "fill-forest text-forest"
                : "fill-transparent text-forest/60",
            )}
          />
        ))}
      </span>
      <span className="text-xs font-medium tabular-nums text-ink-soft">
        {rating.toFixed(1)}
      </span>
      {typeof reviewCount === "number" ? (
        <span className="text-xs tabular-nums text-ink-soft">
          ({reviewCount})
        </span>
      ) : null}
      <span className="sr-only">out of 5</span>
    </div>
  );
}
