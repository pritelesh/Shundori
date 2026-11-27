import type { ComponentProps } from "react";

import { cn } from "@/utils/cn";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive-deep/40 focus-visible:ring-offset-2 focus-visible:ring-offset-peach disabled:pointer-events-none disabled:opacity-45";

/**
 * Brand button styles.
 *
 * Deep Chocolate carries the primary action and Warm Caramel the secondary
 * action. Both combinations meet WCAG AA contrast for normal text.
 */
const buttonVariants = {
  primary:
    "bg-chocolate text-warm-white shadow-primary hover:bg-caramel active:bg-chocolate/90",
  secondary:
    "bg-caramel text-dark-text shadow-secondary hover:bg-chocolate hover:text-warm-white active:bg-caramel/90",
  outline:
    "border border-dark-text/15 bg-transparent text-dark-text hover:border-chocolate hover:bg-soft-cream",
  ghost: "text-chocolate hover:bg-soft-cream",
  link: "h-auto rounded-none px-0 text-chocolate underline decoration-caramel decoration-2 underline-offset-[6px] hover:decoration-chocolate",
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
