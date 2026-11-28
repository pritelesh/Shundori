import type { ComponentProps } from "react";

import { cn } from "@/utils/cn";

const badgeVariants = {
  accent: "bg-leaf text-cream",
  accentSoft: "bg-sage-light text-forest",
  brand: "bg-forest text-cream",
  brandSoft: "bg-lime text-forest",
  neutral: "border border-sage bg-cream text-ink-soft",
  outline: "border border-ink-soft/20 text-forest",
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
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.08em]",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
