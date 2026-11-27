import type { Poisha } from "@/types/product";
import { cn } from "@/utils/cn";
import { formatPrice } from "@/utils/format";

export interface PriceDisplayProps {
  price: Poisha;
  compareAtPrice?: Poisha | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const priceSizes = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
} as const;

const compareSizes = {
  sm: "text-[11px]",
  md: "text-xs",
  lg: "text-sm",
} as const;

export function PriceDisplay({
  price,
  compareAtPrice,
  size = "md",
  className,
}: PriceDisplayProps) {
  const hasCompare =
    compareAtPrice !== null &&
    compareAtPrice !== undefined &&
    compareAtPrice > price;

  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span
        className={cn(
          "font-medium tabular-nums text-dark-text",
          priceSizes[size],
        )}
      >
        {formatPrice(price)}
      </span>
      {hasCompare ? (
        <>
          <span className="sr-only">Original price</span>
          <span
            className={cn(
              "tabular-nums text-taupe line-through decoration-taupe/50",
              compareSizes[size],
            )}
          >
            {formatPrice(compareAtPrice)}
          </span>
        </>
      ) : null}
    </p>
  );
}
