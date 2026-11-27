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
        "group flex flex-col items-center rounded-2xl border border-line/70 bg-white px-5 py-8 text-center transition-all duration-300 hover:-translate-y-1 hover:border-emerald/30 hover:shadow-[0_22px_46px_-32px_rgba(31,31,31,0.35)]",
        className,
      )}
    >
      <span className="flex size-16 items-center justify-center rounded-full border border-line bg-cream-soft font-display text-2xl text-emerald transition-colors group-hover:border-emerald/30 group-hover:bg-emerald-soft">
        {monogram}
      </span>
      <h3 className="mt-4 font-display text-xl text-charcoal">{name}</h3>
      <p className="mt-1 text-xs leading-5 text-muted">{tagline}</p>
      <span className="mt-4 text-[10px] uppercase tracking-[0.18em] text-emerald">
        {productCount} products
      </span>
    </article>
  );
}
