"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, type ReactNode } from "react";

export interface ProductCarouselProps {
  label: string;
  children: ReactNode;
}

/** Horizontally scrollable product carousel with desktop arrow controls. */
export function ProductCarousel({ label, children }: ProductCarouselProps) {
  const trackRef = useRef<HTMLUListElement>(null);

  const scroll = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * Math.min(track.clientWidth * 0.8, 600),
      behavior: "smooth",
    });
  };

  return (
    <div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => scroll(-1)}
          aria-label="Scroll products left"
          className="inline-flex size-11 items-center justify-center rounded-full border border-sage-light bg-cream text-ink-soft transition-colors hover:border-sage"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => scroll(1)}
          aria-label="Scroll products right"
          className="inline-flex size-11 items-center justify-center rounded-full border border-sage-light bg-cream text-ink-soft transition-colors hover:border-sage"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      <ul
        ref={trackRef}
        aria-label={label}
        className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3"
      >
        {children}
      </ul>
    </div>
  );
}
