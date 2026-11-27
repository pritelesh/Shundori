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
        "h-11 w-full rounded-lg border border-line bg-white px-4 text-sm text-charcoal placeholder:text-muted/70 transition-colors focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/15 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
