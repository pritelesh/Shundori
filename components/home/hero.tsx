import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { Localized } from "@/components/layout/localized";
import { ProductVisual } from "@/components/products/product-visual";
import { buttonStyles } from "@/components/ui/button";
import { heroCopy, heroImage, siteConfig } from "@/lib/site";
import type { StoreSettings } from "@/types/phase8";

export interface HeroProps {
  settings: StoreSettings;
}

/**
 * Server-rendered storefront hero. All customer-facing copy and the optional
 * image path live in `lib/site.ts`, so art or wording can change without
 * touching this presentation component.
 */
export function Hero({ settings }: HeroProps) {
  const currency = settings.currency?.trim() || siteConfig.currency;
  const configuredImage = heroImage.src.trim();
  const withCurrency = (copy: string) => copy.replace("{currency}", currency);

  return (
    <section
      aria-labelledby="home-hero-title"
      className="p-2 sm:p-2.5"
    >
      <div className="relative mx-auto flex max-w-7xl items-center overflow-hidden rounded-3xl bg-[linear-gradient(160deg,var(--color-sage),var(--color-sage-light))] px-6 py-10 sm:px-10 lg:min-h-[560px] lg:px-14 lg:py-12">
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 520 360"
          className="pointer-events-none absolute -right-12 -top-20 size-[30rem] text-forest-soft opacity-[0.14] blur-3xl"
        >
          <path
            d="M260 20C150 44 74 134 92 248c110 14 206-62 224-178 8-50-18-64-56-50Z"
            fill="currentColor"
          />
          <path
            d="M96 250C170 178 232 122 286 72"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.55"
          />
          <path
            d="M400 150c-70 4-122 56-128 124 70 8 126-30 142-90 6-22 2-32-14-34Z"
            fill="currentColor"
          />
        </svg>

        <Container className="relative grid w-full items-center gap-8 px-0 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-leaf">
              <Localized en={heroCopy.eyebrow.en} bn={heroCopy.eyebrow.bn} />
              <span
                aria-hidden="true"
                className="h-px w-10 bg-leaf/60"
              />
            </p>

            <h1
              id="home-hero-title"
              className="mt-5 font-sans text-[2.25rem] font-bold leading-[1.06] tracking-[-0.03em] text-forest sm:text-5xl lg:text-[3.35rem]"
            >
              {heroCopy.headline.map((line) => (
                <span key={line.en} className="block">
                  <Localized en={line.en} bn={line.bn} />
                </span>
              ))}
              <span className="mt-1 block text-[2rem] leading-tight sm:text-4xl lg:text-[2.75rem]">
                <span className="hero-accent-en font-script text-leaf">
                  {heroCopy.accent.en}
                </span>
                <span className="hero-accent-bn relative font-sans font-bold text-forest-soft">
                  {heroCopy.accent.bn}
                  <svg
                    aria-hidden="true"
                    focusable="false"
                    viewBox="0 0 220 14"
                    preserveAspectRatio="none"
                    className="absolute -bottom-2 left-0 h-3 w-full text-leaf"
                  >
                    <path
                      d="M3 9C58 2 146 2 217 7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </span>
            </h1>

            <p className="mt-5 max-w-md text-sm leading-6 text-ink-soft sm:text-base sm:leading-7">
              <Localized
                en={withCurrency(heroCopy.subcopy.en)}
                bn={withCurrency(heroCopy.subcopy.bn)}
              />
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href={heroCopy.primaryHref}
                className={buttonStyles({ size: "md" })}
              >
                <Localized
                  en={heroCopy.primaryCta.en}
                  bn={heroCopy.primaryCta.bn}
                />
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href={heroCopy.secondaryHref}
                className={buttonStyles({
                  variant: "ghost",
                  size: "md",
                  className: "border border-forest/15 hover:border-leaf",
                })}
              >
                <Localized
                  en={heroCopy.secondaryCta.en}
                  bn={heroCopy.secondaryCta.bn}
                />
              </Link>
            </div>
          </div>

          <div className="relative mx-auto flex w-full max-w-sm items-center justify-center lg:max-w-none">
            <div
              aria-hidden="true"
              className="absolute aspect-square w-[88%] max-w-[26rem] rounded-full border border-leaf/30"
            />
            {configuredImage ? (
              <div className="relative aspect-[4/5] w-[72%] max-w-[22rem] overflow-hidden rounded-[2rem] shadow-card">
                <Image
                  src={configuredImage}
                  alt={heroImage.alt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 80vw, 38vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="relative flex aspect-[4/5] w-[72%] max-w-[22rem] items-center justify-center overflow-hidden rounded-[2rem] bg-[linear-gradient(160deg,var(--color-sage-light),var(--color-cream))] shadow-card">
                <svg
                  aria-hidden="true"
                  focusable="false"
                  viewBox="0 0 220 220"
                  className="absolute -right-8 -top-8 size-56 rotate-12 text-leaf/20"
                >
                  <path
                    d="M110 18C61 30 27 74 34 126c49 6 91-24 100-72 4-20-4-31-24-36Z"
                    fill="currentColor"
                  />
                  <path
                    d="M39 128C77 100 108 75 127 48"
                    fill="none"
                    stroke="var(--color-cream)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="0.7"
                  />
                  <path
                    d="M166 84c-27 2-48 22-50 49 28 3 50-12 56-36 2-8 1-12-6-13Z"
                    fill="currentColor"
                  />
                </svg>
                <ProductVisual
                  shape="jar"
                  tone="emerald"
                  size="lg"
                  showLabel={false}
                  className="text-[10rem] sm:text-[12rem]"
                />
                <span className="absolute bottom-3 right-3 rounded-full bg-cream/85 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-ink-soft">
                  Placeholder
                </span>
              </div>
            )}
          </div>
        </Container>
      </div>
    </section>
  );
}
