"use client";

import {
  ArrowRight,
  Droplets,
  Flower2,
  Palette,
  Search,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import { Container } from "@/components/layout/container";
import { NavigationMenu } from "@/components/layout/navigation-menu";
import { PageHeader } from "@/components/layout/page-header";
import { BrandCard } from "@/components/products/brand-card";
import { CategoryCard } from "@/components/products/category-card";
import { DiscountBadge } from "@/components/products/discount-badge";
import { PriceDisplay } from "@/components/products/price-display";
import { ProductCard } from "@/components/products/product-card";
import { ProductCardSkeleton } from "@/components/products/product-card-skeleton";
import { ProductRating } from "@/components/products/product-rating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SearchInput } from "@/components/ui/search-input";
import { useToast } from "@/components/ui/toast";
import { mockBrands } from "@/lib/mock/brands";
import { mockCategories } from "@/lib/mock/categories";
import { mockProducts } from "@/lib/mock/products";

const categoryIcons = {
  droplets: Droplets,
  palette: Palette,
  sparkles: Sparkles,
  flower: Flower2,
} as const;

const swatches = [
  {
    name: "Hot Pink",
    hex: "#FF69B4",
    usage: "Primary actions, promotions, highlights",
    className: "bg-pink",
    textClassName: "text-charcoal",
    bordered: false,
  },
  {
    name: "Vanilla Cream",
    hex: "#FFF4DB",
    usage: "Page background",
    className: "bg-cream",
    textClassName: "text-charcoal",
    bordered: true,
  },
  {
    name: "Emerald Green",
    hex: "#046A38",
    usage: "Secondary actions, trust marks, accents",
    className: "bg-emerald",
    textClassName: "text-white",
    bordered: false,
  },
  {
    name: "Dark Charcoal",
    hex: "#1F1F1F",
    usage: "Primary text",
    className: "bg-charcoal",
    textClassName: "text-white",
    bordered: false,
  },
  {
    name: "White",
    hex: "#FFFFFF",
    usage: "Product cards and content surfaces",
    className: "bg-white",
    textClassName: "text-charcoal",
    bordered: true,
  },
] as const;

function PreviewSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-line py-12 first:border-t-0 first:pt-0">
      <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:gap-12">
        <div>
          <h2 className="font-display text-2xl text-charcoal">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}

export default function DesignPreviewPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();

  return (
    <div>
      <PageHeader
        eyebrow="Internal · Design system"
        title="The Shundori interface kit."
        description="Every reusable component, colour and type style in one place. This page is noindex and is not part of the storefront navigation."
      >
        <Badge variant="emeraldSoft">
          <Sparkles className="size-3" aria-hidden="true" />
          Internal preview
        </Badge>
      </PageHeader>

      <Container className="py-12 sm:py-16">
        <PreviewSection
          title="Colour"
          description="Three official brand colours, supported by white surfaces and charcoal text. Pink and emerald tints are derived shades for soft backgrounds and hover states."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {swatches.map((swatch) => (
              <div
                key={swatch.name}
                className="overflow-hidden rounded-2xl border border-line/70 bg-white"
              >
                <div
                  className={`flex h-24 items-end justify-end p-3 ${swatch.className} ${
                    swatch.bordered ? "border-b border-line" : ""
                  }`}
                >
                  <span
                    className={`font-mono text-[10px] uppercase ${swatch.textClassName}`}
                  >
                    {swatch.hex}
                  </span>
                </div>
                <div className="p-4">
                  <p className="font-display text-lg text-charcoal">
                    {swatch.name}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    {swatch.usage}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </PreviewSection>

        <PreviewSection
          title="Typography"
          description="Playfair Display for editorial headings, Inter for body copy and interface elements."
        >
          <div className="space-y-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted">
                Display — Playfair Display
              </p>
              <p className="mt-2 font-display text-4xl leading-[1.05] text-charcoal sm:text-5xl">
                Beauty, thoughtfully curated.
              </p>
              <p className="mt-2 font-display text-2xl italic text-emerald">
                The Shundori edit
              </p>
            </div>

            <div className="max-w-xl">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted">
                Body — Inter
              </p>
              <p className="mt-2 text-base leading-7 text-charcoal">
                Skincare, makeup and fragrance — a considered edit for
                Bangladesh, chosen for quality and made for everyday rituals.
              </p>
              <p className="mt-2 text-sm leading-7 text-muted">
                Secondary copy uses a warm grey for calm hierarchy. Labels use
                uppercase Inter with generous letter spacing.
              </p>
              <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.2em] text-emerald">
                Eyebrow label style
              </p>
            </div>
          </div>
        </PreviewSection>

        <PreviewSection
          title="Buttons"
          description="Hot Pink primary, Emerald Green secondary, plus outline, ghost and link styles. All meet AA contrast."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button>
              Primary
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link style</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
        </PreviewSection>

        <PreviewSection
          title="Badges"
          description="Compact labels for trust marks, promotions and stock states."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="emerald">Curated</Badge>
            <Badge variant="emeraldSoft">In stock</Badge>
            <Badge variant="pink">New in</Badge>
            <Badge variant="pinkSoft">Limited</Badge>
            <Badge variant="neutral">Neutral</Badge>
            <Badge variant="outline">Outline</Badge>
            <DiscountBadge price={245000} compareAtPrice={320000} />
          </div>
        </PreviewSection>

        <PreviewSection
          title="Form fields"
          description="Inputs use white surfaces, warm borders and an emerald focus ring."
        >
          <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="preview-email"
                className="text-xs font-medium text-charcoal"
              >
                Email address
              </label>
              <Input
                id="preview-email"
                type="email"
                placeholder="you@example.com"
                className="mt-2"
              />
            </div>
            <div>
              <label
                htmlFor="preview-phone"
                className="text-xs font-medium text-charcoal"
              >
                Phone number
              </label>
              <Input
                id="preview-phone"
                type="tel"
                placeholder="+880"
                className="mt-2"
              />
            </div>
            <div className="sm:col-span-2">
              <SearchInput aria-label="Preview search" />
            </div>
          </div>
        </PreviewSection>

        <PreviewSection
          title="Price & rating"
          description="Prices are stored in poisha and formatted as BDT. Ratings combine decorative stars with accessible numeric values."
        >
          <div className="space-y-6 rounded-2xl border border-line/70 bg-white p-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted">
                Price display
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-6">
                <PriceDisplay
                  price={245000}
                  compareAtPrice={320000}
                  size="lg"
                />
                <PriceDisplay price={98000} />
                <PriceDisplay price={450000} compareAtPrice={null} size="sm" />
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted">
                Discount badge
              </p>
              <div className="mt-3 flex items-center gap-3">
                <DiscountBadge price={245000} compareAtPrice={320000} />
                <DiscountBadge price={129000} compareAtPrice={165000} />
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted">
                Product rating
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-6">
                <ProductRating rating={4.8} reviewCount={126} />
                <ProductRating rating={4.2} reviewCount={38} />
                <ProductRating rating={5} />
              </div>
            </div>
          </div>
        </PreviewSection>

        <PreviewSection
          title="Product card"
          description="Image area, brand, name, rating, price, discount, stock status, wishlist and add-to-cart — including discounted, low-stock and sold-out states."
        >
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {mockProducts.slice(0, 6).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </PreviewSection>

        <PreviewSection
          title="Loading skeleton"
          description="Shown while product data streams in. Animation is disabled for reduced-motion users."
        >
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
          </div>
        </PreviewSection>

        <PreviewSection
          title="Category & brand cards"
          description="Editorial entry points for catalogue navigation."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {mockCategories.map((category) => (
              <CategoryCard
                key={category.slug}
                name={category.name}
                description={category.description}
                productCount={category.productCount}
                icon={categoryIcons[category.icon]}
              />
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            {mockBrands.map((brand) => (
              <BrandCard
                key={brand.slug}
                name={brand.name}
                tagline={brand.tagline}
                monogram={brand.monogram}
                productCount={brand.productCount}
              />
            ))}
          </div>
        </PreviewSection>

        <PreviewSection
          title="Navigation menu"
          description="Desktop primary navigation. On mobile it becomes a slide-in panel."
        >
          <div className="rounded-2xl border border-line/70 bg-white p-6">
            <NavigationMenu className="flex flex-wrap gap-x-7 gap-y-2" />
          </div>
        </PreviewSection>

        <PreviewSection
          title="Empty state"
          description="Used when a search or filter returns nothing, with an optional recovery action."
        >
          <EmptyState
            icon={Search}
            title="No products found"
            description="Try a different search term or clear your filters to see the full edit."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast({
                    title: "Empty state preview",
                    description: "Filters are not connected yet.",
                    variant: "info",
                  })
                }
              >
                Reset filters
              </Button>
            }
          />
        </PreviewSection>

        <PreviewSection
          title="Modal & toast"
          description="Native dialogs with focus trapping and Escape support, plus non-blocking toast notifications."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setModalOpen(true)}>Open modal</Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast({
                  title: "Saved to wishlist",
                  description: "Radiance Renewal Serum",
                  variant: "success",
                })
              }
            >
              Success toast
            </Button>
            <Button
              onClick={() =>
                toast({
                  title: "Added to bag",
                  description: "Preview bag, saved for this visit only.",
                  variant: "promo",
                })
              }
            >
              Promo toast
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast({
                  title: "Account area opens at launch",
                  description: "Sign-in and order history arrive with the store.",
                  variant: "info",
                })
              }
            >
              Info toast
            </Button>
          </div>

          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="A considered modal"
            description="Built on the native dialog element, with a soft backdrop and a single clear action."
          >
            <p className="text-sm leading-7 text-muted">
              Modals are reserved for focused tasks — size guides, delivery
              details or a confirmation. They close on Escape, on backdrop
              click, and return focus to the trigger.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setModalOpen(false);
                  toast({
                    title: "Modal confirmed",
                    description: "This is a preview interaction.",
                    variant: "success",
                  });
                }}
              >
                Confirm
              </Button>
            </div>
          </Modal>
        </PreviewSection>

        <p className="mt-4 rounded-2xl border border-line bg-cream-soft p-5 text-xs leading-6 text-muted">
          The footer and newsletter section appear on every storefront page.
          Mock products live in <code>lib/mock/</code> and are never imported by
          services or database code.
        </p>
      </Container>
    </div>
  );
}
