import { Search } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/utils/cn";

export interface SearchInputProps extends ComponentProps<"input"> {
  containerClassName?: string;
}

/**
 * Search field used in the header dialog and on listing pages.
 * Purely presentational — search wiring arrives with the catalogue.
 */
export function SearchInput({
  className,
  containerClassName,
  placeholder = "Search products, brands or categories",
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      <Search
        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-taupe"
        aria-hidden="true"
      />
      <input
        type="search"
        placeholder={placeholder}
        className={cn(
          "h-12 w-full rounded-full border border-warm-line bg-warm-white pl-11 pr-4 text-sm text-dark-text placeholder:text-taupe/70 transition-colors focus:border-olive-deep focus:outline-none focus:ring-2 focus:ring-olive-deep/15",
          className,
        )}
        {...props}
      />
    </div>
  );
}
