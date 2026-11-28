import type { ComponentProps } from "react";

import { cn } from "@/utils/cn";

export function Input({
  className,
  type = "text",
  ...props
}: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-11 w-full rounded-lg border border-sage-light bg-cream px-4 text-sm text-ink-soft placeholder:text-ink-soft transition-colors focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/15 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
