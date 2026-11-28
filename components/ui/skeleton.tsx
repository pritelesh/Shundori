import type { ComponentProps } from "react";

import { cn } from "@/utils/cn";

/**
 * Shimmer placeholder used while product data is loading.
 * The animation is disabled automatically under prefers-reduced-motion.
 */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-md bg-sage-light/60",
        className,
      )}
      {...props}
    >
      <span className="absolute inset-0 -translate-x-full animate-[shundori-shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-cream/70 to-transparent" />
    </div>
  );
}
