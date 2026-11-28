import Image from "next/image";

import { ProductVisual } from "@/components/products/product-visual";
import type { ProductTone, ProductVisualShape } from "@/types/product";
import { cn } from "@/utils/cn";

export interface ProductMediaProps {
  imageUrl?: string | null;
  alt: string;
  shape?: ProductVisualShape;
  tone?: ProductTone;
  size?: "sm" | "md" | "lg";
  className?: string;
  visualClassName?: string;
  imageClassName?: string;
  showPlaceholderBadge?: boolean;
  priority?: boolean;
  sizes?: string;
}

/**
 * Reuses the existing product artwork fallback while supporting real Supabase
 * imagery. Images are remote-optimised, eager only when requested, and never
 * render without alternate text. The optional badge discloses CSS placeholder
 * artwork so demonstration cards are not mistaken for real photography.
 */
export function ProductMedia({
  imageUrl,
  alt,
  shape,
  tone,
  size = "md",
  className,
  visualClassName,
  imageClassName = "object-cover",
  showPlaceholderBadge = false,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 33vw",
}: ProductMediaProps) {
  if (!imageUrl) {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden bg-sage-light",
          className,
        )}
      >
        {showPlaceholderBadge ? (
          <span className="absolute left-3 top-3 rounded-full bg-cream/90 px-3 py-1 text-xs font-medium uppercase tracking-[0.08em] text-ink-soft">
            Placeholder artwork
          </span>
        ) : null}
        <ProductVisual
          shape={shape}
          tone={tone}
          size={size}
          className={visualClassName}
        />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-sage-light", className)}>
      <Image
        src={imageUrl}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={imageClassName}
      />
    </div>
  );
}
