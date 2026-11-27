import type { ComponentProps } from "react";

import { cn } from "@/utils/cn";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:pointer-events-none disabled:opacity-45";

/**
 * Brand button styles.
 *
 * Hot Pink carries the primary action, Emerald Green the secondary action.
 * Both combinations meet WCAG AA contrast for normal text.
 */
const buttonVariants = {
  primary:
    "bg-pink text-charcoal shadow-[0_14px_30px_-18px_rgba(255,105,180,0.95)] hover:bg-pink/90 active:bg-pink/85",
  secondary:
    "bg-emerald text-white shadow-[0_14px_30px_-20px_rgba(4,106,56,0.8)] hover:bg-emerald/90 active:bg-emerald/85",
  outline:
    "border border-charcoal/15 bg-transparent text-charcoal hover:border-charcoal/35 hover:bg-white",
  ghost: "text-charcoal hover:bg-pink-tint",
  link: "h-auto rounded-none px-0 text-charcoal underline decoration-pink decoration-2 underline-offset-[6px] hover:decoration-emerald",
} as const;

const buttonSizes = {
  sm: "h-9 px-4 text-xs tracking-[0.04em]",
  md: "h-11 px-6 text-sm",
  lg: "h-12 px-7 text-sm",
  icon: "size-10 p-0",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

/**
 * Shared button classes, also useful for links that should look like buttons.
 */
export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: ButtonStyleOptions = {}): string {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size], className);
}

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonStyles({ variant, size, className })}
      {...props}
    />
  );
}
