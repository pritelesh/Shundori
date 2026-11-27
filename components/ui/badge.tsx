import type { ComponentProps } from "react";

import { cn } from "@/utils/cn";

const badgeVariants = {
  emerald: "bg-emerald text-white",
  emeraldSoft: "bg-emerald-soft text-emerald",
  pink: "bg-pink text-charcoal",
  pinkSoft: "bg-pink-soft text-charcoal",
  neutral: "border border-line bg-white text-muted",
  outline: "border border-charcoal/15 text-charcoal",
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
