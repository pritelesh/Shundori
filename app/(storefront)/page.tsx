import {
  ArrowRight,
  BadgeCheck,
  Droplets,
  Flower2,
  HeartHandshake,
  PackageCheck,
  Palette,
  SearchCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { DemoNotice } from "@/components/catalog/demo-notice";
import { ProductGrid } from "@/components/catalog/product-grid";
import { NewsletterSection } from "@/components/layout/newsletter-section";
import { Container } from "@/components/layout/container";
import { CategoryCard } from "@/components/products/category-card";
import { ProductVisual } from "@/components/products/product-visual";
import { buttonStyles } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { pageMetadata } from "@/lib/seo";
import {
  countProductsByBrand,
  countProductsByCategory,
  getFeaturedProducts,
  getNewArrivals,
  isDemoCatalogue,
  listBrands,
  listCategories,
} from "@/services/catalog";
import { formatPrice } from "@/utils/format";

export async function generateMetadata(): Promise<Metadata> {
  const demo = isDemoCatalogue();
  return pageMetadata({
    title: "Beauty, considered",
    description: demo
      ? "Explore a considered demonstration edit of skincare, makeup, haircare and body care from Shundori."
      : "Explore a considered edit of skincare, makeup, haircare and body care from Shundori.",
    path: "/",
    noIndex: demo,
  });
}

const whyChooseUs = [
  {
    icon: SearchCheck,
    title: "Carefully selected",
    description: "A focused edit rather than an endless catalogue of noise.",
  },
  {
    icon: BadgeCheck,
    title: "Quality-focused",
    description: "Clear product information before you decide what suits you.",
  },
  {
    icon: Truck,
    title: "Convenient ordering",
    description: "A simple browsing and bag experience designed for mobile first.",
  },
  {
    icon: HeartHandshake,
    title: "Customer support",
    description: "A dedicated place to ask questions before and after your order.",
  },
] as const;

const fallbackIcon = Droplets;
const categoryIcons = {
  skincare: Droplets,
  haircare: Sparkles,
  makeup: Palette,
  "face-wash": Droplets,
  moisturizer: Flower2,
  sunscreen: Sparkles,
  "body-care": Flower2,
  "beauty-accessories": PackageCheck,
} as const;

export default function HomePage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeFallback() {
  return (
    <Container className="py-20">
      <div className="h-3 w-28 animate-pulse rounded bg-line" />
      <div className="mt-5 h-10 w-80 max-w-full animate-pulse rounded bg-line" />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="aspect-[4/5] animate-pulse rounded-2xl bg-line" />
        ))}
      </div>
    </Container>
  );
}

async function HomeContent() {
  // Offer prices are time-dependent and live catalogue reads must not depend
  // on build-time database availability. Defer the whole subtree to request
  // time; query failures still surface through app/error.tsx.
  await connection();

  const [categories, brands, bestSellers, newArrivals] = await Promise.all([
    listCategories(),
    listBrands(),
    getFeaturedProducts(8),
    getNewArrivals(4),
  ]);
  const heroProduct = bestSellers[0];
  const demo = isDemoCatalogue();
  const categoryCounts = await Promise.all(
    categories.map((category) => countProductsByCategory(category.slug)),
  );
  const brandCounts = await Promise.all(
    brands.map((brand) => countProductsByBrand(brand.slug)),
  );

  return (
    <div>
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-40 size-[32rem] rounded-full bg-pink/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-44 top-1/2 size-[26rem] rounded-full bg-emerald/10 blur-3xl"
        />

        <Container className="relative grid gap-12 py-12 sm:py-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-16 lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-emerald">
              <Sparkles className="size-3 text-pink" aria-hidden="true" />
              The Shundori edit · Bangladesh
            </p>

            <h1 className="mt-6 max-w-xl font-display text-[2.75rem] leading-[1.03] tracking-[-0.02em] text-charcoal sm:text-6xl lg:text-[4.1rem]">
              Beauty that feels like{" "}
              <span className="relative inline-block italic text-emerald">
                you
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-1 h-[0.12em] rounded-full bg-pink/50"
                />
              </span>
              .
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-muted sm:text-lg sm:leading-8">
              Skincare, makeup and everyday essentials in one calm, considered
              space. Discover a beauty ritual that fits your routine.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/shop" className={buttonStyles({ size: "lg" })}>
                Shop Now
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="#categories"
                className={buttonStyles({ variant: "secondary", size: "lg" })}
              >
                Explore Collection
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-line pt-6 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
              <span className="inline-flex items-center gap-2">
                <Sparkles className="size-4 text-pink" aria-hidden="true" />
                Curated edit
              </span>
              <span className="inline-flex items-center gap-2">
                <Truck className="size-4 text-emerald" aria-hidden="true" />
                Easy browsing
              </span>
              <span className="inline-flex items-center gap-2">
                <HeartHandshake className="size-4 text-emerald" aria-hidden="true" />
                Here to help
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-pink-soft/70 via-pink-tint to-cream-soft">
              <div
                aria-hidden="true"
                className="absolute inset-x-8 bottom-0 top-10 rounded-t-[999px] border border-white/80 bg-white/25"
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-16 bottom-0 top-20 rounded-t-[999px] border border-white/60 bg-white/20"
              />

              <div className="absolute left-6 top-6 z-10">
                <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-emerald">
                  The Shundori edit
                </p>
                <p className="mt-1 font-display text-lg text-charcoal">N°01</p>
              </div>

              <ProductVisual
                shape={heroProduct?.visual ?? "dropper"}
                tone={heroProduct?.tone ?? "emerald"}
                size="lg"
                className="absolute inset-0 pb-8 pt-6"
              />

              <div className="absolute bottom-5 left-5 right-5 z-10 flex items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/95 p-4 shadow-[0_20px_44px_-26px_rgba(31,31,31,0.45)] sm:left-6 sm:right-6">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.16em] text-muted">
                    {heroProduct?.name ?? "Featured edit"}
                  </p>
                  <p className="mt-1 font-display text-lg text-charcoal">
                    {heroProduct?.brand ?? "Shundori"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-charcoal">
                    {heroProduct ? formatPrice(heroProduct.salePrice ?? heroProduct.regularPrice) : "—"}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-emerald">
                    {demo ? "Demo listing" : "Featured product"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-y border-line bg-white">
        <Container className="grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {whyChooseUs.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-soft text-emerald">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-charcoal">{title}</p>
                <p className="mt-0.5 text-xs leading-5 text-muted">{description}</p>
              </div>
            </div>
          ))}
        </Container>
      </section>

      <section
        id="categories"
        className="scroll-mt-24 py-16 sm:py-20"
        aria-labelledby="categories-title"
      >
        <Container>
          <SectionHeading
            id="categories-title"
            eyebrow="Shop by category"
            title="Find your ritual."
            description="Eight considered edits, from the first cleanse of the morning to the finishing touch."
            action={
              <Link
                href="/shop"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald underline-offset-4 hover:underline"
              >
                View all products
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            }
          />

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {categories.map((category, index) => (
              <CategoryCard
                key={category.slug}
                name={category.name}
                description={category.description}
                productCount={categoryCounts[index] ?? 0}
                icon={categoryIcons[category.slug as keyof typeof categoryIcons] ?? fallbackIcon}
                href={`/category/${category.slug}`}
                visual={category.visual}
                tone={category.tone}
                imageUrl={category.imageUrl}
              />
            ))}
          </div>
        </Container>
      </section>

      <section
        id="brands"
        className="scroll-mt-24 border-y border-line bg-white py-16 sm:py-20"
        aria-labelledby="brands-title"
      >
        <Container>
          <SectionHeading
            id="brands-title"
            eyebrow="Featured brands"
            title="Names you know."
            description={
              demo
                ? "Brand names are presented accurately as text. Official logos are not used in this preview."
                : "Brand names and administrator-uploaded logos are shown together."
            }
          />

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {brands.map((brand, index) => (
              <Link
                key={brand.slug}
                href={`/brand/${brand.slug}`}
                className="group flex min-h-40 flex-col items-center justify-center rounded-2xl border border-line/70 bg-cream-soft p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:border-line-strong hover:bg-white hover:shadow-[0_22px_44px_-32px_rgba(31,31,31,0.45)]"
              >
                <span className="relative flex size-14 items-center justify-center overflow-hidden rounded-full border border-line bg-white font-display text-xl text-emerald">
                  {brand.logoUrl ? (
                    <Image
                      src={brand.logoUrl}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-contain p-2"
                    />
                  ) : (
                    brand.monogram
                  )}
                </span>
                <span className="mt-4 font-display text-lg leading-tight text-charcoal">
                  {brand.name}
                </span>
                <span className="mt-1.5 text-[10px] uppercase tracking-[0.16em] text-muted">
                  {brandCounts[index] ?? 0}
                  {demo ? " demo products" : " products"}
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section
        id="bestsellers"
        className="scroll-mt-24 py-16 sm:py-20"
        aria-labelledby="bestsellers-title"
      >
        <Container>
          <SectionHeading
            id="bestsellers-title"
            eyebrow="Best sellers"
            title="The most-loved edit."
            description="A starting point for your routine — explore the full catalogue for more."
            action={
              <Link
                href="/shop"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald underline-offset-4 hover:underline"
              >
                Shop all products
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            }
          />

          <DemoNotice demo={demo} className="mt-8 max-w-3xl" />
          <div className="mt-8">
            <ProductGrid products={bestSellers} />
          </div>
        </Container>
      </section>

      <section className="border-y border-line bg-cream-soft/70 py-16 sm:py-20" aria-labelledby="new-arrivals-title">
        <Container>
          <SectionHeading
            id="new-arrivals-title"
            eyebrow="New arrivals"
            title="Freshly added."
            description={demo ? "The latest listings in this demonstration catalogue." : "The latest additions to the Shundori collection."}
            action={
              <Link
                href="/shop?sort=newest"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald underline-offset-4 hover:underline"
              >
                See all new arrivals
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            }
          />

          <div className="mt-10">
            <ProductGrid products={newArrivals} columns="four" />
          </div>
        </Container>
      </section>

      <section className="py-16 sm:py-20" aria-labelledby="offers-title">
        <Container>
          <div className="relative overflow-hidden rounded-[2rem] bg-emerald px-6 py-12 text-white sm:px-12 sm:py-16">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-pink/25 blur-3xl"
            />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.2em] text-white/80">
                  <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-pink" />
                  Special offers
                </p>
                <h2 id="offers-title" className="mt-4 max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
                  Small changes, beautiful difference.
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-white/85">
                  {demo
                    ? "Explore the current demonstration offers across cleansers, moisturisers and colour. Prices are illustrative and shown in Bangladeshi Taka."
                    : "Explore the current offers across cleansers, moisturisers and colour. Prices are shown in Bangladeshi Taka."}
                </p>
              </div>
              <Link
                href="/shop?sort=price-asc"
                className={buttonStyles({
                  variant: "primary",
                  size: "lg",
                  className: "shrink-0",
                })}
              >
                Shop the offers
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <section
        id="about"
        className="scroll-mt-24 border-y border-line bg-white py-16 sm:py-20"
        aria-labelledby="about-title"
      >
        <Container>
          <SectionHeading
            id="about-title"
            eyebrow="Why choose Shundori"
            title="Beauty, with intention."
            description="A calmer way to discover products, built around clarity and useful choices."
          />

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {whyChooseUs.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-2xl border border-line/70 bg-cream-soft/50 p-6">
                <span className="flex size-11 items-center justify-center rounded-full bg-white text-emerald">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-display text-xl text-charcoal">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <Link
              href="/about"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald underline-offset-4 hover:underline"
            >
              More about Shundori
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>

      <NewsletterSection
        id="home-newsletter"
        titleId="home-newsletter-title"
        emailId="home-newsletter-email"
      />
    </div>
  );
}
