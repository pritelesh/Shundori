"use client";

import Image from "next/image";
import { useState } from "react";

import type { CatalogImage } from "@/types/product";
import { cn } from "@/utils/cn";

import { ProductVisual } from "./product-visual";

export interface ProductGalleryProps {
  images: readonly CatalogImage[];
  name: string;
  className?: string;
}

/** Placeholder-aware gallery with optimized, responsive product imagery. */
export function ProductGallery({ images, name, className }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex] ?? images[0];

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-pink-tint via-cream-soft to-cream-deep/50 sm:aspect-[5/5]">
        {!active?.url ? (
          <span className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1 text-[9px] font-medium uppercase tracking-[0.16em] text-muted">
            Placeholder artwork
          </span>
        ) : null}
        {active?.url ? (
          <Image
            src={active.url}
            alt={active.alt}
            fill
            sizes="(max-width: 768px) 90vw, (max-width: 1200px) 50vw, 600px"
            className="object-contain p-8"
          />
        ) : active ? (
          <ProductVisual
            shape={active.visual}
            tone={active.tone}
            size="lg"
            className="text-[11rem] sm:text-[15rem]"
          />
        ) : (
          <p className="text-sm text-muted">No image available for {name}.</p>
        )}
      </div>

      {images.length > 1 ? (
        <div
          className="flex max-w-full flex-wrap gap-3"
          role="group"
          aria-label="Product images"
        >
          {images.map((image, index) => (
            <button
              key={`${image.visual}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`View ${image.alt}`}
              aria-pressed={activeIndex === index}
              className={cn(
                "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-cream-soft transition-colors sm:size-24",
                activeIndex === index
                  ? "border-emerald ring-2 ring-emerald/20"
                  : "border-line hover:border-line-strong",
              )}
            >
              {image.url ? (
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 80px, 96px"
                  className="object-contain p-2"
                />
              ) : (
                <ProductVisual
                  shape={image.visual}
                  tone={image.tone}
                  size="sm"
                  className="text-[2.5rem]"
                />
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
