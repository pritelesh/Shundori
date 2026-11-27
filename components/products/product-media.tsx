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
  priority?: boolean;
  sizes?: string;
}

/**
 * Reuses the existing product artwork fallback while supporting real Supabase
 * imagery. Images are remote-optimised, eager only when requested, and never
 * render without alternate text.
 */
export function ProductMedia({
  imageUrl,
  alt,
  shape,
  tone,
  size = "md",
  className,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 33vw",
}: ProductMediaProps) {
  if (!imageUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden bg-cream-deep",
          className,
        )}
      >
        <ProductVisual shape={shape} tone={tone} size={size} />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-cream-deep", className)}>
      <Image
        src={imageUrl}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}
