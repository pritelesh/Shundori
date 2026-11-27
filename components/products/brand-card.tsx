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
        "group flex flex-col items-center rounded-2xl border border-warm-line/70 bg-warm-white px-5 py-8 text-center transition-all duration-300 hover:-translate-y-1 hover:border-olive-deep/30 hover:shadow-soft",
        className,
      )}
    >
      <span className="flex size-16 items-center justify-center rounded-full border border-warm-line bg-warm-white font-display text-2xl text-olive-deep transition-colors group-hover:border-olive-deep/30 group-hover:bg-olive-soft">
        {monogram}
      </span>
      <h3 className="mt-4 font-display text-xl text-dark-text">{name}</h3>
      <p className="mt-1 text-xs leading-5 text-taupe">{tagline}</p>
      <span className="mt-4 text-[10px] uppercase tracking-[0.18em] text-olive-deep">
        {productCount} products
      </span>
    </article>
  );
}
