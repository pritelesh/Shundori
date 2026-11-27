import { ArrowUpRight, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { ProductTone, ProductVisualShape } from "@/types/product";
import { cn } from "@/utils/cn";

import { ProductVisual } from "./product-visual";

export interface CategoryCardProps {
  name: string;
  description: string;
  productCount: number;
  icon: LucideIcon;
  href?: string;
  className?: string;
  visual?: ProductVisualShape;
  tone?: ProductTone;
  imageUrl?: string | null;
}

export function CategoryCard({
  name,
  description,
  productCount,
  icon: Icon,
  href,
  className,
  visual,
  tone,
  imageUrl,
}: CategoryCardProps) {
  const content = (
    <>
      <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-soft-cream via-warm-white to-light-beige/60">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
          />
        ) : null}
        <span
          aria-hidden="true"
          className="absolute size-36 rounded-full border border-white/90"
        />
        <span
          aria-hidden="true"
          className="absolute size-24 rounded-full border border-white/70"
        />
        {!imageUrl && visual ? (
          <span className="relative flex size-32 items-center justify-center" aria-hidden="true">
            <ProductVisual shape={visual} tone={tone} size="md" className="text-[4rem]" />
          </span>
        ) : !imageUrl ? (
          <span className="relative flex size-14 items-center justify-center rounded-full bg-warm-white text-olive-deep shadow-soft">
            <Icon className="size-6" aria-hidden="true" />
          </span>
        ) : null}
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-xl text-dark-text">{name}</h3>
          <ArrowUpRight
            className="size-4 text-taupe transition-colors group-hover:text-olive-deep"
            aria-hidden="true"
          />
        </div>
        <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-taupe">
          {productCount} products
        </p>
        <p className="mt-3 text-sm leading-6 text-taupe">{description}</p>
      </div>
    </>
  );

  const cardClass = cn(
    "group flex flex-col overflow-hidden rounded-2xl border border-warm-line/70 bg-warm-white p-2.5 transition-all duration-300 hover:-translate-y-1 hover:border-warm-line-strong hover:shadow-soft",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={cardClass}>
        {content}
      </Link>
    );
  }

  return <article className={cardClass}>{content}</article>;
}
