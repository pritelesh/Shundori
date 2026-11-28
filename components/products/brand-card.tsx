import { cn } from "@/utils/cn";

export interface BrandCardProps {
  name: string;
  tagline: string;
  monogram: string;
  productCount: number;
  className?: string;
}

export function BrandCard({
  name,
  tagline,
  monogram,
  productCount,
  className,
}: BrandCardProps) {
  return (
    <article
      className={cn(
        "surface-card group flex flex-col items-center rounded-2xl px-5 py-8 text-center transition-all duration-300 hover:-translate-y-1 hover:border-leaf/30 hover:shadow-soft",
        className,
      )}
    >
      <span className="flex size-16 items-center justify-center rounded-full border border-sage-light bg-cream font-display text-2xl text-leaf transition-colors group-hover:border-leaf/30 group-hover:bg-sage-light">
        {monogram}
      </span>
      <h3 className="mt-4 font-display text-xl text-forest">{name}</h3>
      <p className="mt-1 text-xs leading-5 text-ink-soft">{tagline}</p>
      <span className="mt-4 text-xs uppercase tracking-[0.08em] text-leaf">
        {productCount} products
      </span>
    </article>
  );
}
