import { Badge } from "@/components/ui/badge";
import type { Poisha } from "@/types/product";
import { cn } from "@/utils/cn";
import { discountPercent } from "@/utils/format";

export interface DiscountBadgeProps {
  price: Poisha;
  compareAtPrice: Poisha | null;
  className?: string;
}

export function DiscountBadge({
  price,
  compareAtPrice,
  className,
}: DiscountBadgeProps) {
  const percent = discountPercent(price, compareAtPrice);

  if (percent === null) {
    return null;
  }

  return (
    <Badge
      variant="pink"
      className={cn("shadow-sm", className)}
      aria-label={`-${percent}% off`}
    >
      -{percent}%
    </Badge>
  );
}
