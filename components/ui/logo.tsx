import Image from "next/image";

import { cn } from "@/utils/cn";

export interface LogoProps {
  className?: string;
  /** Show the "Beauty · Dhaka" line under the wordmark. */
  withTagline?: boolean;
  size?: "sm" | "md" | "lg";
  /** Public store logo from the `store-assets` bucket, when configured. */
  imageUrl?: string | null;
  /** Admin-configured store name; falls back to the Shundori wordmark. */
  name?: string;
  tagline?: string;
}

const sizes = {
  sm: "text-lg tracking-[0.24em]",
  md: "text-2xl tracking-[0.26em]",
  lg: "text-3xl tracking-[0.28em]",
} as const;

const imageSizes = {
  sm: { width: 88, height: 32 },
  md: { width: 112, height: 40 },
  lg: { width: 144, height: 52 },
} as const;

/**
 * Store wordmark. An admin-uploaded logo replaces the text mark, while the
 * default wordmark remains available wherever no store settings are present.
 */
export function Logo({
  className,
  withTagline = true,
  size = "md",
  imageUrl,
  name = "Shundori",
  tagline = "Beauty · Dhaka",
}: LogoProps) {
  const dimensions = imageSizes[size];

  return (
    <span className={cn("inline-flex flex-col leading-none", className)}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={name}
          width={dimensions.width}
          height={dimensions.height}
          className="max-h-12 w-auto max-w-[12rem] object-contain"
          priority
        />
      ) : (
        <span
          className={cn(
            "font-display font-medium text-chocolate",
            sizes[size],
          )}
        >
          {name}
        </span>
      )}
      {withTagline ? (
        <span className="mt-1.5 text-[8px] font-medium uppercase tracking-[0.34em] text-olive-deep">
          {tagline}
        </span>
      ) : null}
    </span>
  );
}
