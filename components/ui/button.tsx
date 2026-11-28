import type { ComponentProps } from "react";

import { cn } from "@/utils/cn";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40 focus-visible:ring-offset-2 focus-visible:ring-offset-mist disabled:pointer-events-none disabled:opacity-45";

/**
 * Brand button styles.
 *
 * Forest carries the primary action with cream text; forest-soft and leaf carry
 * secondary emphasis. The destructive action uses a forest-outlined cream pill
 * and fills on hover. Every combination meets WCAG AA contrast.
 */
const buttonVariants = {
  primary:
    "bg-forest text-cream shadow-primary hover:bg-forest-soft hover:text-cream active:bg-forest active:text-cream",
  secondary:
    "bg-forest-soft text-cream shadow-secondary hover:bg-leaf hover:text-cream active:bg-forest-soft active:text-cream",
  outline:
    "border border-ink-soft bg-transparent text-forest hover:border-leaf hover:bg-sage-light",
  ghost: "text-forest hover:bg-sage-light",
  destructive:
    "border border-forest bg-cream text-forest shadow-secondary hover:bg-forest hover:text-cream active:bg-forest-soft active:text-cream",
  link: "h-auto rounded-none px-0 text-leaf underline decoration-sage decoration-2 underline-offset-[6px] hover:decoration-leaf",
} as const;

const buttonSizes = {
  sm: "h-11 px-4 text-xs tracking-[0.04em]",
  md: "h-11 px-6 text-sm",
  lg: "h-12 px-7 text-sm",
  icon: "size-11 p-0",
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
