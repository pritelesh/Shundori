import type { ComponentProps } from "react";

import { cn } from "@/utils/cn";

const badgeVariants = {
  accent: "bg-olive-deep text-warm-white",
  accentSoft: "bg-olive-soft text-olive-deep",
  brand: "bg-chocolate text-warm-white",
  brandSoft: "bg-peach-tint text-dark-text",
  neutral: "border border-warm-line bg-warm-white text-taupe",
  outline: "border border-dark-text/15 text-chocolate",
} as const;

export type BadgeVariant = keyof typeof badgeVariants;

export interface BadgeProps extends ComponentProps<"span"> {
  variant?: BadgeVariant;
}

export function Badge({
  className,
  variant = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em]",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
