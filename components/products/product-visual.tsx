import type { ProductTone, ProductVisualShape } from "@/types/product";
import { cn } from "@/utils/cn";

export interface ProductVisualProps {
  shape?: ProductVisualShape;
  tone?: ProductTone;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Placeholder product artwork.
 *
 * Real product photography will replace these compositions once the catalogue
 * is supplied. Everything is drawn with CSS in `em` units, so a single shape
 * scales from a small card to the hero without extra assets.
 */
const sizeClasses = {
  sm: "text-[3.25rem]",
  md: "text-[6rem]",
  lg: "text-[15rem]",
} as const;

const toneGlow: Record<ProductTone, string> = {
  pink: "bg-pink/30",
  emerald: "bg-emerald/15",
  charcoal: "bg-charcoal/10",
  cream: "bg-cream-deep/80",
};

const toneAccent: Record<ProductTone, string> = {
  pink: "bg-pink",
  emerald: "bg-emerald",
  charcoal: "bg-charcoal",
  cream: "bg-line-strong",
};

const toneBorder: Record<ProductTone, string> = {
  pink: "border-pink/40",
  emerald: "border-emerald/30",
  charcoal: "border-charcoal/25",
  cream: "border-line-strong",
};

function ProductLabel({
  tone,
  subtitle,
}: {
  tone: ProductTone;
  subtitle: string;
}) {
  return (
    <span
      className={cn(
        "absolute inset-x-[0.12em] top-1/2 block -translate-y-1/2 border-y py-[0.09em] text-center",
        toneBorder[tone],
      )}
    >
      <span className="block font-display text-[0.095em] leading-none tracking-[0.24em] text-charcoal/80">
        Shundori
      </span>
      <span className="mt-[0.07em] block text-[0.045em] uppercase leading-none tracking-[0.16em] text-muted/80">
        {subtitle}
      </span>
    </span>
  );
}

const bodySurface =
  "border border-white/70 bg-gradient-to-b from-white via-cream-soft to-cream-deep/90";
const bodyShadow =
  "shadow-[0_0.14em_0.34em_-0.12em_rgba(31,31,31,0.35)]";

function Shape({
  shape,
  tone,
}: {
  shape: ProductVisualShape;
  tone: ProductTone;
}) {
  switch (shape) {
    case "dropper":
      return (
        <div className="flex flex-col items-center">
          <span className="h-[0.16em] w-[0.24em] rounded-t-[0.12em] bg-charcoal/90" />
          <span className="h-[0.26em] w-[0.44em] rounded-[0.04em] bg-charcoal" />
          <div
            className={cn(
              "relative h-[1.5em] w-[1.05em] rounded-t-[0.26em] rounded-b-[0.16em]",
              bodySurface,
              bodyShadow,
            )}
          >
            <span className="absolute inset-y-[0.14em] left-[0.11em] w-[0.08em] rounded-full bg-white/60" />
            <ProductLabel tone={tone} subtitle="Radiance serum" />
            <span
              className={cn(
                "absolute inset-x-[0.3em] bottom-[0.12em] h-[0.03em] rounded-full opacity-70",
                toneAccent[tone],
              )}
            />
          </div>
        </div>
      );

    case "bottle":
      return (
        <div className="flex flex-col items-center">
          <span className="h-[0.08em] w-[0.34em] rounded-full bg-charcoal" />
          <span className="h-[0.18em] w-[0.15em] bg-charcoal/85" />
          <div
            className={cn(
              "relative h-[1.42em] w-[1.08em] rounded-[0.1em]",
              bodySurface,
              bodyShadow,
            )}
          >
            <span className="absolute inset-y-[0.14em] left-[0.1em] w-[0.09em] rounded-full bg-white/60" />
            <ProductLabel tone={tone} subtitle="Silk foundation" />
          </div>
        </div>
      );

    case "jar":
      return (
        <div className="flex flex-col items-center">
          <span className="h-[0.22em] w-[1.08em] rounded-t-[0.1em] rounded-b-[0.03em] bg-charcoal" />
          <div
            className={cn(
              "relative h-[0.62em] w-[0.98em] rounded-b-[0.16em]",
              bodySurface,
              bodyShadow,
            )}
          >
            <ProductLabel tone={tone} subtitle="Hydra cloud" />
          </div>
        </div>
      );

    case "tube":
      return (
        <div className="flex flex-col items-center">
          <span className="h-[0.15em] w-[0.42em] rounded-t-[0.04em] bg-charcoal" />
          <div
            className={cn(
              "relative h-[1.32em] w-[0.76em] rounded-t-[0.06em] rounded-b-[0.28em]",
              bodySurface,
              bodyShadow,
            )}
          >
            <span className="absolute inset-y-[0.12em] left-[0.08em] w-[0.07em] rounded-full bg-white/60" />
            <ProductLabel tone={tone} subtitle="Daily ritual" />
            <span className="absolute inset-x-0 bottom-0 h-[0.035em] bg-charcoal/15" />
          </div>
        </div>
      );

    case "lipstick":
      return (
        <div className="flex flex-col items-center">
          <span className="relative h-[0.5em] w-[0.34em] overflow-hidden rounded-t-[0.17em] bg-gradient-to-b from-pink to-pink-soft">
            <span className="absolute inset-y-0 left-[18%] w-[18%] bg-white/30" />
          </span>
          <span className="h-[0.14em] w-[0.4em] bg-charcoal" />
          <span className="h-[0.48em] w-[0.46em] rounded-b-[0.03em] bg-gradient-to-b from-charcoal to-charcoal/85" />
          <span className="h-[0.09em] w-[0.5em] rounded-b-[0.03em] bg-charcoal/80" />
        </div>
      );

    case "perfume":
      return (
        <div className="flex flex-col items-center">
          <span className="h-[0.32em] w-[0.5em] rounded-[0.04em] bg-charcoal" />
          <span className="h-[0.1em] w-[0.18em] bg-charcoal/70" />
          <div
            className={cn(
              "relative h-[1.12em] w-[0.98em] rounded-[0.12em] border border-white/70 bg-gradient-to-b from-white/95 via-pink-tint to-pink-soft/80 shadow-[0_0.14em_0.34em_-0.12em_rgba(31,31,31,0.3)]",
            )}
          >
            <span className="absolute inset-x-[0.07em] bottom-[0.07em] h-[0.52em] rounded-b-[0.09em] bg-pink/20" />
            <ProductLabel tone={tone} subtitle="Eau de parfum" />
          </div>
        </div>
      );

    case "mist":
      return (
        <div className="flex flex-col items-center">
          <span className="h-[0.16em] w-[0.12em] bg-charcoal/80" />
          <span className="h-[0.1em] w-[0.3em] rounded-[0.03em] bg-charcoal" />
          <div
            className={cn(
              "relative h-[1.34em] w-[0.62em] rounded-[0.18em]",
              bodySurface,
              bodyShadow,
            )}
          >
            <ProductLabel tone={tone} subtitle="Face mist" />
          </div>
        </div>
      );

    case "compact":
      return (
        <div className="flex flex-col items-center">
          <span className="flex size-[0.9em] items-center justify-center rounded-full border-[0.03em] border-charcoal/80 bg-gradient-to-br from-charcoal to-charcoal/80 shadow-[0_0.14em_0.34em_-0.12em_rgba(31,31,31,0.45)]">
            <span className="flex size-[0.6em] items-center justify-center rounded-full bg-cream-soft font-display text-[0.18em] text-charcoal/70">
              S
            </span>
          </span>
          <span className="mt-[0.06em] h-[0.12em] w-[0.48em] rounded-b-[0.06em] bg-charcoal/20" />
        </div>
      );

    default:
      return null;
  }
}

export function ProductVisual({
  shape = "dropper",
  tone = "pink",
  size = "md",
  className,
}: ProductVisualProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative flex items-center justify-center",
        sizeClasses[size],
        className,
      )}
    >
      <span
        className={cn(
          "absolute size-[2.4em] rounded-full opacity-70 blur-2xl",
          toneGlow[tone],
        )}
      />
      <div className="relative flex flex-col items-center">
        <Shape shape={shape} tone={tone} />
        <span className="mt-[0.1em] h-[0.16em] w-[1.2em] rounded-[50%] bg-charcoal/10 blur-[2px]" />
      </div>
    </div>
  );
}
